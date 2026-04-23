const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();
const OpenAI = require("openai");   // 👈 ADD THIS
const openai = new OpenAI({         // 👈 ADD THIS
  apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

function extractJson(text) {
  if (!text) return null;

  // Remove ```json ... ``` fences if present
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Try full parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  // Try to extract first JSON object from the text
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
- amount must be the final total paid`
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
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


app.post("/api/chat", async (req, res) => {
  try {
    const { message, selectedFinancialYear, transactions = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const getFinancialYearRange = (label) => {
      const [startText, endText] = label.split("/");
      const startYear = Number(startText);
      const endYear = 2000 + Number(endText);

      return {
        start: new Date(startYear, 3, 6, 0, 0, 0, 0),
        end: new Date(endYear, 3, 5, 23, 59, 59, 999),
      };
    };

    const yearRange = getFinancialYearRange(selectedFinancialYear);

    const yearTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= yearRange.start && d <= yearRange.end;
    });

    const income = yearTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const expenses = yearTransactions
      .filter((t) => t.type !== "income")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const profit = income - expenses;
    const profitMargin = income > 0 ? (profit / income) * 100 : 0;

    const incomeTransactions = yearTransactions.filter((t) => t.type === "income");
    const expenseTransactions = yearTransactions.filter((t) => t.type !== "income");

    // Group expenses by category
    const categoryTotals = {};
    expenseTransactions.forEach((t) => {
      const category = t.category || "Other";
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(t.amount);
    });

    // Top 3 expense categories
    const topExpenseCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
      }));

    const biggestExpenseCategory =
      topExpenseCategories.length > 0 ? topExpenseCategories[0] : null;

    const keyInsight = biggestExpenseCategory
      ? `${biggestExpenseCategory.category} is your largest expense category at £${biggestExpenseCategory.amount}.`
      : "You do not yet have enough expense data to identify a main spending category.";

    const financialContext = {
      selectedFinancialYear,
      income,
      expenses,
      profit,
      profitMargin: Number(profitMargin.toFixed(1)),
      transactionCount: yearTransactions.length,
      incomeTransactionCount: incomeTransactions.length,
      expenseTransactionCount: expenseTransactions.length,
      averageTransactionValue:
        yearTransactions.length > 0
          ? Number(((income + expenses) / yearTransactions.length).toFixed(2))
          : 0,
      topExpenseCategories,
      recentTransactions: yearTransactions.slice(-5).map((t) => ({
        amount: t.amount,
        category: t.category,
        date: t.date,
      })),
      keyInsight,
    };


    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
 content: `
You are Enyi AI, a premium finance copilot for UK sole traders.

Your job is not to summarise. Your job is to identify what matters, what looks inefficient, and what the user should do next.

Voice:
- Sharp, calm, confident
- Human and natural
- Concise, never fluffy
- Sounds like a paid advisor, not a chatbot

Rules:
- Use only the provided financial data
- Do not invent figures
- Do not say generic things like "your finances are strong" unless you explain why
- Focus on 1 or 2 important insights only
- Keep answers short and useful
- Avoid numbering sections like 1, 2, 3

Preferred style:
- Start with the most important takeaway
- Then explain what is driving it
- End with a clear action
- If relevant, point out the single biggest spending issue
- If the data is thin, say so briefly

Good example:
"Your biggest issue is visibility, not profitability. An 81% margin is strong, but too much of your spending sits in Misc, which makes it harder to control.

That means your numbers look healthy, but you may be hiding waste inside poorly labelled expenses.

Next move: review Misc line by line and reclassify recurring costs first."
`

        },
        {
          role: "user",
          content: `User question: ${message}

Financial context:
${JSON.stringify(financialContext, null, 2)}`
        }
      ]
    });

    res.json({
      reply:
        response.output_text ||
        "Sorry, I could not generate a reply."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate AI reply." });
  }
});
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
            "You extract an expense category and amount from a user's text. Return valid JSON only."
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
      category: parsed.category || "Misc",
      amount: Number(parsed.amount) || 0
    });
  } catch (error) {
    console.error("Categorise expense error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Could not categorise expense." });
  }
});
app.listen(4000, () => {
  console.log("Server running on port 4000");
});