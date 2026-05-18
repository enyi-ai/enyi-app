const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Enyi backend is awake"
  });
});

function extractJson(text) {
  if (!text) return null;

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {}

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const possibleJson = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(possibleJson);
    } catch (e) {
      return null;
    }
  }

  return null;
}

// ── RECEIPT PARSE ─────────────────────────────────────────
app.post("/api/receipt/parse", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mimeType = req.file.mimetype;
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Read this receipt image and return ONLY a JSON object with no explanation and no markdown.

Use exactly this structure:
{
  "merchant": "string",
  "amount": "number as string",
  "date": "dd/mm/yyyy or empty string",
  "category": "one word only from Travel, Food, Utilities, Rent, Misc",
  "notes": "short string"
}

Rules:
- Return only JSON
- No backticks
- No extra words
- amount must be the final total paid
- For UK receipts, dates are usually dd/mm/yyyy
- Read the payment/date line of the receipt carefully
- If the receipt shows "Date: 29/04/2026", return "29/04/2026"
- Do not guess the month
- If the month is unclear, return an empty string instead of guessing`
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        temperature: 0
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Failed to parse receipt"
      });
    }

    const text = data.choices?.[0]?.message?.content || "";
    const parsed = extractJson(text);

    if (!parsed) {
      return res.status(500).json({
        error: "Model did not return valid JSON",
        raw: text
      });
    }

    res.json({
      merchant: parsed.merchant || "Unknown merchant",
      amount: parsed.amount || "0",
      date: parsed.date || "",
      category: parsed.category || "Misc",
      notes: parsed.notes || ""
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// ── AI CHAT ───────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, context, selectedFinancialYear, transactions = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    let financialContext;

    if (context) {
      // New frontend sends structured time-aware context
      financialContext = context;
    } else {
      // Fallback — safe split with default
      const safeFY = (selectedFinancialYear && selectedFinancialYear.includes("/"))
        ? selectedFinancialYear
        : "2026/27";

      const parts = safeFY.split("/");
      const startYear = Number(parts[0]);
      const endYear = 2000 + Number(parts[1]);

      const fyStart = new Date(startYear, 3, 6, 0, 0, 0, 0);
      const fyEnd = new Date(endYear, 3, 5, 23, 59, 59, 999);

      const yearTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= fyStart && d <= fyEnd;
      });

      const income = yearTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const expenses = yearTransactions
        .filter(t => t.type !== "income")
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      financialContext = {
        selectedFinancialYear: safeFY,
        financialYear: { income, expenses, profit: income - expenses }
      };
    }

    // ── FORMAT CONTEXT FOR PROMPT ──
    const formatCurrency = (n) =>
      `£${Number(n || 0).toLocaleString("en-GB", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

    const tm = financialContext.thisMonth || {};
    const lm = financialContext.lastMonthSummary || {};
    const fy = financialContext.financialYear || {};
    const flagged = financialContext.flaggedNonAllowableSpend || {};
    const vatStatus = financialContext.vatStatus || "SAFE";
    const rolling12m = financialContext.rolling12mIncome || 0;

    const contextSummary = `
TODAY'S DATE: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
FINANCIAL YEAR: ${financialContext.selectedFinancialYear || ""}
CURRENT MONTH: ${financialContext.currentMonth || ""}
LAST MONTH: ${financialContext.lastMonth || ""}

THIS MONTH (${financialContext.currentMonth || "current month"}):
- Income: ${formatCurrency(tm.income)}
- Expenses: ${formatCurrency(tm.expenses)}
- Profit: ${formatCurrency(tm.profit)}
- Profit margin: ${tm.profitMargin || 0}%
- Transactions: ${tm.transactionCount || 0}
- Top spending categories: ${Object.entries(tm.categoryTotals || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, a]) => `${c} (${formatCurrency(a)})`).join(", ") || "none"}

LAST MONTH (${financialContext.lastMonth || "last month"}):
- Income: ${formatCurrency(lm.income)}
- Expenses: ${formatCurrency(lm.expenses)}
- Profit: ${formatCurrency(lm.profit)}
- Profit margin: ${lm.profitMargin || 0}%

FINANCIAL YEAR TO DATE (${financialContext.selectedFinancialYear || ""}):
- Income: ${formatCurrency(fy.income)}
- Expenses: ${formatCurrency(fy.expenses)}
- Profit: ${formatCurrency(fy.profit)}
- Profit margin: ${fy.profitMargin || 0}%
- Transactions: ${fy.transactionCount || 0}
- Top categories: ${Object.entries(fy.categoryTotals || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, a]) => `${c} (${formatCurrency(a)})`).join(", ") || "none"}

VAT STATUS:
- Rolling 12-month income: ${formatCurrency(rolling12m)}
- Status: ${vatStatus} ${vatStatus === "EXCEEDED" ? "— MUST REGISTER IMMEDIATELY" : vatStatus === "APPROACHING" ? "— approaching £90,000 threshold" : "— below threshold"}

HMRC NON-ALLOWABLE SPEND FLAGS:
${Object.keys(flagged).length > 0
  ? Object.entries(flagged).map(([c, a]) => `- ${c}: ${formatCurrency(a)} (may not be tax-allowable)`).join("\n")
  : "- No flagged categories"}

TOTAL TRANSACTIONS ON RECORD: ${financialContext.totalTransactions || 0}
`;

    const systemPrompt = `
You are Enyi AI — a sharp, warm, and deeply knowledgeable UK business finance coach for sole traders and small business owners.

You have access to the user's real financial data broken down into: this month, last month, and the current financial year. You also have VAT status and HMRC compliance flags.

CRITICAL RULES:
1. ALWAYS distinguish between monthly and annual figures — never mix them up
2. When the user asks about "this month", use ONLY the THIS MONTH data
3. When the user asks about "this year" or the financial year, use FINANCIAL YEAR data
4. Use the user's ACTUAL numbers — never estimate or invent figures
5. If a figure is zero or missing, acknowledge it honestly
6. End EVERY response with one specific follow-up coaching question or next action
7. Never number your sections (no 1. 2. 3.)
8. Keep responses concise — 3 to 5 short paragraphs maximum

YOUR VOICE:
- Confident and direct, like a trusted accountant friend
- Warm but never fluffy
- Use plain English — no jargon
- Never sound like a corporate report

COACHING BEHAVIOUR:
- Spot patterns the user hasn't noticed
- Challenge assumptions gently
- Flag HMRC risks proactively using UK tax rules
- Always give one specific, actionable next step with a real number
- If VAT status is EXCEEDED, make this urgent and clear
- If non-allowable spend is flagged, explain the HMRC implication

TOPIC BOUNDARIES:
- Finance, business, tax, money questions: answer fully
- Unrelated topics: say "I focus on finance and business — happy to help with anything in that space."

RESPONSE FORMAT:
- Start with the direct answer
- Add context from real data
- End with a coaching question that moves them forward
`;

    // ── OPENAI CALL ──
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `User question: "${message}"\n\n${contextSummary}`
        }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    res.json({
      reply: response.choices[0]?.message?.content || "Sorry, I could not generate a reply."
    });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Could not generate AI reply." });
  }
});

// ── CATEGORISE EXPENSE ────────────────────────────────────
app.post("/api/categorise-expense", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Expense text is required." });
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
          `You are a UK HMRC tax categorisation assistant for self-employed sole traders.

Given an expense description, return a JSON object with exactly these fields:
- category: the HMRC expense category
- amount: the numeric amount extracted from the text (0 if not found)
- allowability: one of "always", "conditional", or "never"
- confidence: one of "high", "medium", or "low"
- hmrcNote: brief plain English note explaining the allowability

ALLOWABILITY RULES:
- "always": clearly business (Software, Marketing, Office, Professional fees, Insurance, Stock, Wages, Bank charges)
- "never": clearly personal (Groceries, Mortgage, Personal, Shopping, Entertainment)
- "conditional": ambiguous, depends on business use (Fuel, Travel, Food, Phone, Utilities, Clothing, Rent, Training)

CATEGORIES — use exactly these values:
Travel, Fuel, Office, Phone, Software, Marketing, Professional fees, Training, Utilities, Insurance, Stock, Wages, Bank charges, Rent, Food, Clothing, Groceries, Mortgage, Personal, Entertainment, Misc

Return ONLY valid JSON. No text outside the JSON.`

        },
        {
          role: "user",
          content: `
Categorise this expense and extract the amount.

User input:
"${text}"

Return EXACTLY in this JSON format:
{
  "category": "Travel",
  "amount": 60
}
`
        }
      ]
    });

    const textOutput = response.output_text || "";
    const cleaned = textOutput
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return res.json({
  category: parsed.category,
  amount: parsed.amount,
  allowability: parsed.allowability || "conditional",
  confidence: parsed.confidence || "medium",
  hmrcNote: parsed.hmrcNote || ""
});

  } catch (error) {
    console.error("Categorise expense error:", error);
    return res.status(500).json({
      error: error.message || "Could not categorise expense."
    });
  }
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
