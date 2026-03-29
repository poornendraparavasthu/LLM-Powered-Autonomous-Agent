import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

const MAX = 2000;

export default function ChatInput({ onSend, connectionStatus, disabled }) {
  const [input, setInput] = useState("");
  const ref = useRef(null);

  const submit = useCallback(() => {
    const t = input.trim();
    if (!t || disabled || connectionStatus !== "connected") return;
    onSend(t);
    setInput("");
    if (ref.current) ref.current.style.height = "auto";
  }, [input, disabled, onSend, connectionStatus]);

  const onKey = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }, [submit]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 140)}px`;
  }, [input]);

  const connected = connectionStatus === "connected";
  const hasText = input.trim().length > 0;
  const charsLeft = MAX - input.length;

  return (
    <div className="input-wrap">
      <div className="input-box">
        <textarea
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX))}
          onKeyDown={onKey}
          placeholder={connected ? "Describe a Linux task…" : "Connecting to backend…"}
          disabled={!connected || disabled}
          rows={1}
          className="input-field"
        />

        {input.length > MAX - 400 && (
          <span
            className="text-[0.65rem] font-mono self-end pb-1 flex-shrink-0"
            style={{ color: charsLeft < 100 ? "hsl(var(--red))" : "hsl(var(--ink-3))" }}
          >
            {charsLeft}
          </span>
        )}

        <button
          onClick={submit}
          disabled={!hasText || !connected || disabled}
          className={`send-btn ${hasText && connected && !disabled ? "ready" : ""}`}
          title="Send (Enter)"
        >
          {disabled
            ? <Loader2 className="h-3.5 w-3.5 spin" />
            : <ArrowUp className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      <p className="text-[0.66rem] mt-1.5 pl-1" style={{ color: "hsl(var(--ink-3))" }}>
        Enter to send · Shift+Enter for new line
        {!connected && <span className="ml-2" style={{ color: "hsl(var(--yellow))" }}>· {connectionStatus}</span>}
      </p>
    </div>
  );
}
