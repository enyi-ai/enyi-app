import { useState, useRef, useEffect } from "react";
import "./AIChatPanel.css";
const starterPrompts = [
  "Financial health check",
  "Spending review",
  "Tax optimisation",
  "Growth advice"
];

function AIChatPanel({ selectedFinancialYear, transactions }) {
  const [messages, setMessages] = useState([

      {
  role: "assistant",
  content:
    "Ask me about your profit, spending, financial trends, or tax estimate."
    }
    
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);


  const clearChat = () => {
  setMessages([
    {
      role: "assistant",
      content: "Ask me about your profit, spending, financial trends, or tax estimate."
    }
  ]);
};
  const messagesEndRef = useRef(null);
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
      const response = await 
fetch(`${process.env.REACT_APP_API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          selectedFinancialYear,
          transactions
        })
      });

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
          content:
            "Sorry — something went wrong while getting your finance summary."
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
  return (
    <section className="ai-chat-card">
  <div className="ai-chat-header">

    <div>
     <h2 className="section-title">Enyi AI</h2>
      <p>Your friendly business coach and finance assistant</p>
    </div>

    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <button
        type="button"
        onClick={clearChat}
        style={{
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          color: "#6b7280",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          cursor: "pointer"
        }}
      >
        Clear chat
      </button>

      <div className="brand-chip">AI</div>
    </div>
  </div>

  <div className="ai-starter-prompts">
    {starterPrompts.map((prompt) => (
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

      <div className="ai-chat-messages" ref={messagesEndRef}>
  {messages.map((message, index) => (
    <div
      key={index}
      className={`ai-message ${
        message.role === "user" ? "ai-message-user" : "ai-message-assistant"
      }`}
    >
      <div className="ai-message-role">
        {message.role === "user" ? "You" : "Enyi AI"}
      </div>

      <div
        className="ai-message-content"
        dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
      />
    </div>
  ))}

  {loading && (
    <div className="ai-message ai-message-assistant">
      <div className="ai-message-role">Enyi AI</div>
      <div className="ai-message-content">Typing…</div>
    </div>
  )}
</div>

      <div className="ai-chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          className="fin-input"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage(input);
            }
          }}
        />

        <button
          type="button"
          className="primary-button"
          onClick={() => sendMessage(input)}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </section>
  );
}

export default AIChatPanel;
