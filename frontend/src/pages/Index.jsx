import { useState, useCallback, useRef, useEffect } from "react";
import { Terminal, Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

let messageIdCounter = 0;
function generateId() {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}`;
}

export default function IndexPage() {
  const [messages, setMessages] = useState([]);
  const [activeCommandId, setActiveCommandId] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef(null);
  const isRunningRef = useRef(false);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case "generated": {
        const entry = {
          id: generateId(),
          role: "ai",
          content: `Generated ${msg.commands.length} command${msg.commands.length > 1 ? "s" : ""} for ${msg.distro}`,
          timestamp: new Date(),
          distro: msg.distro,
          commands: msg.commands,
          risk: msg.risk,
        };
        setMessages((prev) => [...prev, entry]);
        break;
      }
      case "output": {
        if (isRunningRef.current) {
          setTerminalOutput((prev) => prev + msg.data);
        }
        break;
      }
      case "done": {
        isRunningRef.current = false;
        setIsRunning(false);
        setActiveCommandId(null);
        break;
      }
      case "error": {
        const errorEntry = {
          id: generateId(),
          role: "error",
          content: msg.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorEntry]);
        isRunningRef.current = false;
        setIsRunning(false);
        break;
      }
    }
  }, []);

  const { status, sendMessage, reconnect } = useWebSocket(handleMessage);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, terminalOutput]);

  const handleSend = useCallback(
    (text) => {
      const userEntry = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userEntry]);
      sendMessage({ type: "generate", input: text });
    },
    [sendMessage]
  );

  const handleRunCommand = useCallback(
    (command, commandId) => {
      setActiveCommandId(commandId);
      setTerminalOutput("");
      isRunningRef.current = true;
      setIsRunning(true);
      sendMessage({ type: "run", command });
    },
    [sendMessage]
  );

  const handleTerminalInput = useCallback(
    (data) => {
      sendMessage({ type: "input", data });
    },
    [sendMessage]
  );

  return (
  <div className="min-h-screen flex flex-col bg-[#0a0e17] text-[#d4ffcc]">

    {/* Header - no extra left icon bullshit */}
    <header className="header">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold neon-text">Linux AI Assistant</h1>
        <div className={`status-pill ${status === "connected" ? "crt-glow" : ""}`}>
          {status === "connected" ? "SYSTEM ONLINE" : status.toUpperCase()}
        </div>
      </div>
    </header>

    {/* Main content - less top waste */}
    <main className="flex-1 flex flex-col px-6 py-8">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center space-y-10">
            <h2 className="welcome-title">Welcome to Linux AI Assistant</h2>
            <p className="welcome-subtitle">
              Ask me to help with any Linux task. I'll generate the right commands for your system, and you can run them instantly.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {["Install Docker", "Check disk usage", "Setup firewall", "Find large files"].map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={status !== "connected"}
                  className="prompt-suggestion"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
  {messages.map((entry) => (
    <ChatMessage
      key={entry.id}
      entry={entry}
      activeCommandId={activeCommandId}
      terminalOutput={terminalOutput}
      isRunning={isRunning}
      onRunCommand={handleRunCommand}
      onTerminalInput={handleTerminalInput}
    />
  ))}
</div>
        )}
      </div>
    </main>

    {/* Input - full width, no extra padding waste */}
    <div className="input-area">
      <div className="max-w-5xl mx-auto px-6 py-5">
        <ChatInput onSend={handleSend} connectionStatus={status} />
      </div>
    </div>
  </div>
);
}