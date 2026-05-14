import { useState, useRef, useEffect } from "react";
import "./AIChatPanel.css";

function AIChatPanel({ selectedFinancialYear, transactions }) {

  // --- DYNAMIC SMART SUGGESTIONS BASED ON REAL DATA ---
  const getSmartSuggestions = () => {
    const suggestions = [];

    const expenses = (transactions || []).filter(t => t.type !== "income");
    const categoryTotals = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    const totalIncome = (transactions || [])
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const nonAllowable = ["Groceries", "Mortgage", "Clothing"];
    const hasFlag = expenses.some(t => nonAllowable.includes(t.category));

    suggestions.push("What's my financial health this month?");
    suggestions.push("How much tax should I set aside?");

    if (topCategory) {
      suggestions.push(`Why is my ${topCategory[0]} spend so high?`);
    } else {
      suggestions.push("Give me a spending review");
    }

    if (hasFlag) {
      suggestions.push("Which expenses might HMRC reject?");
    } else if (totalIncome > 0) {
      suggestions.push("How can I grow my profit margin?");
    } else {
      suggestions.push("Give me growth advice");
    }

    return suggestions.slice(0, 4);
  };

  const getOpeningMessage = () => {
    const total = (transactions || []).length;
    const totalIncome = (transactions || [])
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (total === 0) {
      return "Add your first transaction and I'll start analysing your finances.";
    }

    return `I can see ${total} transactions recorded in ${selectedFinancialYear}, with £${totalIncome.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in income. What would you like to know?`;
  };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: getOpeningMessage()
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: getOpeningMessage()
      }
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
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            selectedFinancialYear,
            transactions
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
          content: "Sorry — something went wrong while getting your finance summary."
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
