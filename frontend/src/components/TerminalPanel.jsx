import { useCallback, useEffect, useRef } from "react";
import { Clipboard, Square, Terminal } from "lucide-react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export default function TerminalPanel({ output, onInput, status, focusSignal, onCopyOutput, onCancel, runningCommand }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const lastLenRef = useRef(0);
  const clickRef = useRef(null);

  const init = useCallback(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new XTerm({
      theme: {
        background:  "#08080f",
        foreground:  "#d4d4e8",
        cursor:      "#818cf8",
        cursorAccent:"#08080f",
        selectionBackground: "#818cf820",
        black:   "#1e1e2e", red:     "#f38ba8",
        green:   "#a6e3a1", yellow:  "#f9e2af",
        blue:    "#89b4fa", magenta: "#cba6f7",
        cyan:    "#89dceb", white:   "#cdd6f4",
        brightBlack:   "#45475a", brightRed:     "#f38ba8",
        brightGreen:   "#a6e3a1", brightYellow:  "#f9e2af",
        brightBlue:    "#89b4fa", brightMagenta: "#cba6f7",
        brightCyan:    "#89dceb", brightWhite:   "#cdd6f4",
      },
      fontFamily: "'Geist Mono', 'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: "bar",
      cursorWidth: 2,
      scrollback: 3000,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    requestAnimationFrame(() => { try { fit.fit(); term.focus(); } catch {} });

    term.onData((data) => {
      const chunk = 1024;
      if (data.length > chunk) {
        for (let i = 0; i < data.length; i += chunk) {
          const s = data.slice(i, i + chunk);
          setTimeout(() => onInput?.(s), (i / chunk) * 10);
        }
      } else {
        onInput?.(data);
      }
    });

    termRef.current = term;
    fitRef.current = fit;
    lastLenRef.current = 0;
    clickRef.current = () => term.focus();
    containerRef.current.addEventListener("click", clickRef.current);
  }, [onInput]);

  useEffect(() => {
    init();
    const node = containerRef.current;
    return () => {
      if (node && clickRef.current) node.removeEventListener("click", clickRef.current);
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
      lastLenRef.current = 0;
    };
  }, [init]);

  useEffect(() => {
    if (!termRef.current) return;
    if (output.length < lastLenRef.current) {
      termRef.current.clear();
      termRef.current.reset();
      lastLenRef.current = 0;
    }
    const chunk = output.slice(lastLenRef.current);
    if (chunk) {
      requestAnimationFrame(() => {
        try { termRef.current?.write(chunk); lastLenRef.current = output.length; } catch {}
      });
    }
  }, [output]);

  useEffect(() => {
    const handler = debounce(() => { try { fitRef.current?.fit(); } catch {} }, 150);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!termRef.current) return;
    try { fitRef.current?.fit(); termRef.current.focus(); } catch {}
  }, [focusSignal]);

  const isActive = status === "running" || status === "awaiting input" || status === "awaiting_input";

  return (
    <div className="term-frame h-full w-full overflow-hidden">
      {/* Title bar */}
      <div className="term-bar">
        <div className="flex items-center gap-2.5">
          <div className="term-dots">
            <div className="term-dot" style={{ background: "#ff5f56" }} />
            <div className="term-dot" style={{ background: "#ffbd2e" }} />
            <div className="term-dot" style={{ background: "#27c93f" }} />
          </div>
          <div className="term-bar-info">
            <Terminal className="h-3 w-3" />
            <span>bash</span>
            {runningCommand && (
              <>
                <span style={{ opacity: 0.4 }}>—</span>
                <span className="term-bar-running">{runningCommand}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isActive && (
            <span className="chip chip-blue" style={{ fontSize: "0.62rem" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {status}
            </span>
          )}
          <button onClick={onCopyOutput} title="Copy output" className="term-bar-btn">
            <Clipboard className="h-3 w-3" />
          </button>
          <button onClick={onCancel} title="Stop" className="term-bar-btn stop">
            <Square className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* xterm */}
      <div
        ref={containerRef}
        className="w-full cursor-text"
        style={{ height: "calc(100% - 36px)", paddingTop: "2px" }}
      />
    </div>
  );
}
