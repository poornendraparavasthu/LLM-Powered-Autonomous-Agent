import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TerminalPanel from "@/components/TerminalPanel";

let messageIdCounter = 0;
function generateId() {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}`;
}

export default function IndexPage() {

  const [messages, setMessages] = useState([]);
  const [terminalOutput, setTerminalOutput] = useState("");

  const scrollRef = useRef(null);

  const handleMessage = useCallback((msg) => {

    switch (msg.type) {

      /*
      ---------------------------------------
      GENERATED COMMANDS (NEW STRUCTURE)
      ---------------------------------------
      */

      case "generated": {

        const entry = {
          id: generateId(),
          role: "ai",
          content: `Generated ${msg.steps?.length || 0} step${msg.steps?.length > 1 ? "s" : ""} for ${msg.distro}`,
          timestamp: new Date(),
          distro: msg.distro,
          steps: msg.steps || []
        };

        setMessages(prev => [...prev, entry]);
        break;
      }

      /*
      ---------------------------------------
      TERMINAL OUTPUT
      ---------------------------------------
      */

      case "output": {

        setTerminalOutput(prev => prev + msg.data);
        break;

      }

      /*
      ---------------------------------------
      ERROR MESSAGE
      ---------------------------------------
      */

      case "error": {

        const entry = {
          id: generateId(),
          role: "error",
          content: msg.message,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, entry]);
        break;

      }

      default:
        break;
    }

  }, []);

  const { status, sendMessage } = useWebSocket(handleMessage);

  useEffect(() => {

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

  }, [messages]);

  /*
  ---------------------------------------
  SEND USER PROMPT
  ---------------------------------------
  */

  const handleSend = useCallback((text) => {

    const userEntry = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userEntry]);

    sendMessage({
      type: "generate",
      input: text
    });

  }, [sendMessage]);

  /*
  ---------------------------------------
  RUN COMMAND
  ---------------------------------------
  */

  const handleRunCommand = useCallback((command) => {

    sendMessage({
      type: "run",
      command
    });

  }, [sendMessage]);

  /*
  ---------------------------------------
  TERMINAL INPUT
  ---------------------------------------
  */

  const handleTerminalInput = useCallback((data) => {

    sendMessage({
      type: "input",
      data
    });

  }, [sendMessage]);

  /*
  ---------------------------------------
  EXPLAIN COMMAND
  ---------------------------------------
  */

  const handleExplainCommand = useCallback(async (command) => {

    try {

      const res = await fetch("http://localhost:3000/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command })
      });

      const data = await res.json();

      return data.explanation;

    } catch {

      return "Failed to generate explanation.";

    }

  }, []);

  return (

    <div className="h-screen flex bg-[#0a0e17] text-[#d4ffcc]">

      {/* LEFT SIDE - CHAT */}

      <div className="w-[60%] flex flex-col border-r border-[#1c2433]">

        {/* Header */}

        <header className="px-6 py-4 border-b border-[#1c2433]">

          <h1 className="text-xl font-bold neon-text">
            Linux AI Assistant
          </h1>

        </header>

        {/* Chat Area */}

        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-8"
        >

          {messages.length === 0 ? (

            <div className="flex flex-col items-center justify-center h-full text-center space-y-8">

              <h2 className="text-3xl font-bold neon-text">
                Welcome to Linux AI Assistant
              </h2>

              <p className="max-w-xl text-[#9adf93]">
                Ask me to help with any Linux task. I will generate commands
                for your system and you can execute them instantly.
              </p>

              <div className="flex gap-4 flex-wrap justify-center">

                {[
                  "Install Docker",
                  "Check disk usage",
                  "Setup firewall",
                  "Find large files"
                ].map((s) => (

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
                  onRunCommand={handleRunCommand}
                  onExplainCommand={handleExplainCommand}
                />

              ))}

            </div>

          )}

        </main>

        {/* Input */}

        <div className="border-t border-[#1c2433]">

          <div className="px-6 py-4">

            <ChatInput
              onSend={handleSend}
              connectionStatus={status}
            />

          </div>

        </div>

      </div>

      {/* RIGHT SIDE - TERMINAL */}

      <div className="w-[40%] bg-black">

        <TerminalPanel
          output={terminalOutput}
          onInput={handleTerminalInput}
        />

      </div>

    </div>

  );

}