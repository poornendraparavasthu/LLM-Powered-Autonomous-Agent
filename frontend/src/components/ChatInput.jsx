import { useState, useCallback, useRef, useEffect } from "react";
import { Send, Terminal } from "lucide-react";

export default function ChatInput({ onSend, connectionStatus, disabled }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const statusColor =
    connectionStatus === "connected"
      ? "bg-[#00ff88]"
      : connectionStatus === "connecting"
        ? "bg-[#ffaa00]"
        : "bg-[#ff4444]";

  const statusText =
    connectionStatus === "connected"
      ? "Connected"
      : connectionStatus === "connecting"
        ? "Connecting..."
        : "Disconnected";

  return (
<div className="relative">

  {/* Top subtle scanline glow */}
  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[hsl(var(--terminal)/0.4)] to-transparent opacity-40" />

  <div className="pt-6">

    {/* Connection Status */}
    <div className="flex items-center gap-3 mb-6 px-3">
      <span className="relative flex h-3 w-3">
        {connectionStatus === "connecting" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--terminal))] opacity-70" />
        )}

        <span
          className={`relative inline-flex rounded-full h-3 w-3 ${
            connectionStatus === "connected"
              ? "bg-[hsl(var(--terminal))] crt-glow"
              : connectionStatus === "connecting"
              ? "bg-[hsl(var(--yellow))]"
              : "bg-[hsl(var(--red))]"
          }`}
        />
      </span>

      <span className="text-xs font-mono tracking-wider text-[hsl(var(--fg)/0.7)]">
        {connectionStatus === "connected"
          ? "SYSTEM ONLINE"
          : connectionStatus === "connecting"
          ? "CONNECTING..."
          : "DISCONNECTED"}
      </span>
    </div>


    {/* Input Container */}
    <div className="relative group terminal-window">

      {/* Focus glow ring */}
      <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-[hsl(var(--terminal)/0.25)] via-transparent to-[hsl(var(--terminal)/0.25)] opacity-0 group-focus-within:opacity-90 blur-lg transition-all duration-500 pointer-events-none" />

      <div className="relative flex items-end gap-4 px-6 py-6">

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything... e.g. install nginx"
          disabled={connectionStatus !== "connected" || disabled}
          rows={1}
          className="input-field pl-11 pr-4 py-3 text-base leading-relaxed caret-[hsl(var(--cyan))] placeholder-[hsl(var(--terminal-dim)/0.7)]"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || connectionStatus !== "connected" || disabled}
          className={`flex items-center justify-center w-12 h-12 rounded-lg border transition-all duration-200 active:scale-95 shrink-0 ${
            !input.trim() || connectionStatus !== "connected" || disabled
              ? "opacity-40 cursor-not-allowed bg-[hsl(var(--terminal)/0.08)] border-[hsl(var(--terminal)/0.2)] text-[hsl(var(--terminal)/0.5)]"
              : "bg-[hsl(var(--terminal)/0.15)] text-[hsl(var(--terminal))] border-[hsl(var(--terminal)/0.4)] hover:bg-[hsl(var(--terminal)/0.25)] hover:shadow-[0_0_22px_hsl(var(--terminal)/0.45)] crt-glow"
          }`}
        >
          <Send className="w-5 h-5" />
        </button>

      </div>
    </div>


    {/* Helper Text */}
    <p className="text-xs text-[hsl(var(--fg)/0.5)] mt-5 px-3 font-mono tracking-wide">
      Enter → Send  ·  Shift+Enter → New Line
    </p>

  </div>
</div>
);
}