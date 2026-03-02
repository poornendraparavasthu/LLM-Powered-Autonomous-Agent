import React, { useState } from "react";
import MessageBubble from "./MessageBubble";
import LogsPanel from "./LogsPanel";

function ChatUI() {
  const [messages, setMessages] = useState([
    { text: "Hello! I am your AI Agent 🤖", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState([]);

  const handleSend = () => {
    if (!input) return;

    // Add user message
    setMessages((prev) => [...prev, { text: input, sender: "user" }]);

    // Simulated logs
    setLogs((prev) => [...prev, "🟡 Processing command..."]);

    setTimeout(() => {
      setLogs((prev) => [...prev, "⚙️ Breaking task into steps..."]);
    }, 1000);

    setTimeout(() => {
      setLogs((prev) => [...prev, "✅ Execution complete"]);
    }, 2000);

    // Fake AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "Task executed successfully ✅", sender: "bot" }
      ]);
    }, 1500);

    setInput("");
  };

  return (
    <div className="chat-container">

      {/* CHAT SECTION */}
      <div className="chat-section">

        <div className="chat-box">
          {messages.map((msg, i) => (
            <MessageBubble key={i} text={msg.text} sender={msg.sender} />
          ))}
        </div>

        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your command..."
          />
          <button onClick={handleSend}>Send</button>
        </div>

      </div>

      {/* LOGS SECTION */}
      <LogsPanel logs={logs} />

    </div>
  );
}

export default ChatUI;