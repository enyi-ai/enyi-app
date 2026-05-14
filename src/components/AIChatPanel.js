import { useState, useRef, useEffect } from "react";
import "./AIChatPanel.css";

function AIChatPanel({ selectedFinancialYear, transactions }) {

  // --- BUILD TIME-AWARE FINANCIAL CONTEXT ---
  const buildContext = () => {
    const now = new Date();
    const safeFY = selectedFinancialYear || "2026/27";

    const summarise = (txList) => {
      const income = txList
        .filter(t => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0);
      const expenses = txList
        .filter(t => t.type !== "income")
        .reduce((s, t) => s + Number(t.amount), 0);
      const categoryTotals = {};
      txList.filter(t => t.type !== "income").forEach(t => {
        categoryTotals[t.category] =
          (categoryTotals[t.category] || 0) + Number(t.amount);
      });
      return {
        income: parseFloat(income.toFixed(2)),
        expenses: parseFloat(expenses.toFixed(2)),
        profit: parseFloat((income - expenses).toFixed(2)),
        profitMargin: income > 0
          ? Math.round(((income - expenses) / income) * 100)
          : 0,
        categoryTotals,
        transactionCount: txList.length
      };
    };

    // THIS MONTH
    const thisMonthTx = (transactions || []).filter(t => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });

    // LAST MONTH
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthTx = (transactions || []).filter(t => {
      const d = new Date(t.date);
      return (
        d.getMonth() === lastMonthDate.getMonth() &&
        d.getFullYear() === lastMonthDate.getFullYear()
      );
    });

    // FINANCIAL YEAR — safe split
    const fyParts = safeFY.split("/");
    const fyStartYear = fyParts[0];
    const fyEndShort = fyParts[1];
    const fyStart = new Date(`${fyStartYear}-04-06`);
    const fyEnd = new Date(`20${fyEndShort}-04-05`);

    const fyTx = (transactions || []).filter(t => {
      const d = new Date(t.date);
      return d >= fyStart && d <= fyEnd;
    });

    // ROLLING 12 MONTHS FOR VAT
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const rolling12mIncome = (transactions || [])
      .filter(t => {
        const d = new Date(t.date);
        return t.type === "income" && d >= twelveMonthsAgo && d <= now;
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    // NON-ALLOWABLE FLAGS
    const nonAllowable = ["Groceries", "Mortgage", "Clothing", "Shopping"];
    const flaggedSpend = {};
    (transactions || [])
      .filter(t => t.type !== "income" && nonAllowable.includes(t.category))
      .forEach(t => {
        flaggedSpend[t.category] =
          (flaggedSpend[t.category] || 0) + Number(t.amount);
      });

    return {
      currentMonth: now.toLocaleString("en-GB", {
        month: "long",
        year: "numeric"
      }),
      lastMonth: lastMonthDate.toLocaleString("en-GB", {
        month: "long",
        year: "numeric"
      }),
      selectedFinancialYear: safeFY,
      thisMonth: summarise(thisMonthTx),
      lastMonthSummary: summarise(lastMonthTx),
      financialYear: summarise(fyTx),
      rolling12mIncome: parseFloat(rolling12mIncome.toFixed(2)),
      vatThreshold: 90000,
      vatStatus: rolling12mIncome >= 90000
        ? "EXCEEDED"
        : rolling12mIncome >= 76500
        ? "APPROACHING"
        : "SAFE",
      flaggedNonAllowableSpend: flaggedSpend,
      recentTransactions: (transactions || []).slice(0, 15),
      totalTransactions: (transactions || []).length
    };
  };

  // --- DYNAMIC SMART SUGGESTIONS ---
  const getSmartSuggestions = () => {
    const suggestions = [];
    const now = new Date();

    const expenses = (transactions || []).filter(t => t.type !== "income");
    const categoryTotals = {};
    expenses.forEach(t => {
      categoryTotals[t.category] =
        (categoryTotals[t.category] || 0) + Number(t.amount);
    });
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    const thisMonthIncome = (transactions || [])
      .filter(t => {
        const d = new Date(t.date);
        return (
          t.type === "income" &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const nonAllowable = ["Groceries", "Mortgage", "Clothing", "Shopping"];
    const hasFlag = expenses.some(t => nonAllowable.includes(t.category));

    const rolling12m = (transactions || [])
      .filter(t => {
        const d = new Date(t.date);
        const ago = new Date();
        ago.setMonth(ago.getMonth() - 12);
        return t.type === "income" && d >= ago;
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    suggestions.push("What's my financial health this month?");
    suggestions.push("How much tax should I set aside?");

    if (topCategory) {
      suggestions.push(`Why is my ${topCategory[0]} spend so high?`);
    } else {
      suggestions.push("Give me a spending review");
    }

    if (rolling12m >= 76500) {
      suggestions.push("Do I need to register for VAT?");
    } else if (hasFlag) {
      suggestions.push("Which expenses might HMRC reject?");
    } else if (thisMonthIncome > 0) {
      suggestions.push("How can I improve my profit margin?");
    } else {
      suggestions.push("Give me growth advice");
    }

    return suggestions.slice(0, 4);
  };

  // --- OPENING MESSAGE ---
  const getOpeningMessage = () => {
    const total = (transactions || []).length;
    const now = new Date();

    const thisMonthIncome = (transactions || [])
      .filter(t => {
        const d = new Date(t.date);
        return (
          t.type === "income" &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const thisMonthExpenses = (transactions || [])
      .filter(t => {
        const d = new Date(t.date);
        return (
          t.type !== "income" &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const monthName = now.toLocaleString("en-GB", { month: "long" });

    if (total === 0) {
      return "Add your first transaction and I'll start coaching you on your finances.";
    }

    if (thisMonthIncome === 0) {
      return `I can see ${total} transactions in ${selectedFinancialYear || "this year"}. No income recorded yet this month — want me to review your year so far?`;
    }

    const margin = thisMonthIncome > 0
      ? Math.round(
          ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100
        )
      : 0;

    return `${monthName} so far: £${thisMonthIncome.toLocaleString("en-GB", {
      minimumFractionDigits: 2
    })} income, £${thisMonthExpenses.toLocaleString("en-GB", {
      minimumFractionDigits: 2
    })} expenses — ${margin}% margin. What would you like to work on?`;
  };

  const [messages, setMessages] = useState([
    { role: "assistant", content: getOpeningMessage() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const clearChat = () => {
    setMessages([
      { role: "assistant", content: getOpeningMessage() }
    ]);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTo({
        top: messagesEndRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  const sendMessage = async (messageText) => {
    const text = messageText.trim();
    if (!text || loading) return;

    const updatedMessages = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const context = buildContext();

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            context
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not get AI response.");
      }

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply || "I could not generate a reply."
        }
      ]);
    } catch (error) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry — something went wrong. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatMessageContent = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br/>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");
  };

  const smartSuggestions = getSmartSuggestions();

  return (
    <section className="ai-chat-card">

      {/* HEADER */}
      <div className="ai-chat-header">
        <div className="ai-chat-header-left">
          <div className="ai-chat-title-row">
            <div className="ai-chat-badge">AI</div>
            <h2 className="ai-chat-title">Enyi AI</h2>
          </div>
          <p className="ai-chat-subtitle">
            Your intelligent business finance assistant
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="ai-clear-button"
        >
          Clear chat
        </button>
      </div>

      {/* SMART SUGGESTION CHIPS */}
      <div className="ai-starter-prompts">
        {smartSuggestions.map((prompt) => (
          <button
            key={prompt}
            className="ai-starter-button"
            onClick={() => sendMessage(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* CHAT WINDOW */}
      <div className="ai-chat-messages" ref={messagesEndRef}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`ai-message ${
              message.role === "user"
                ? "ai-message-user"
                : "ai-message-assistant"
            }`}
          >
            <div className="ai-message-role">
              {message.role === "user" ? "You" : "Enyi AI"}
            </div>
            <div
              className="ai-message-content"
              dangerouslySetInnerHTML={{
                __html: formatMessageContent(message.content)
              }}
            />
          </div>
        ))}

        {loading && (
          <div className="ai-message ai-message-assistant">
            <div className="ai-message-role">Enyi AI</div>
            <div className="ai-message-content ai-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className="ai-chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          className="ai-chat-input"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage(input);
          }}
        />
        <button
          type="button"
          className="ai-send-button"
          onClick={() => sendMessage(input)}
          disabled={loading}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>

    </section>
  );
}

export default AIChatPanel;
