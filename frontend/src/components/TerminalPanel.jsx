import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Clipboard, Square, Terminal } from "lucide-react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const TerminalPanel = forwardRef(function TerminalPanel(
  { onInput, onResize, status, focusSignal, onCopyOutput, onCancel, runningCommand },
  ref
) {
  const containerRef = useRef(null);
  const termRef      = useRef(null);
  const fitRef       = useRef(null);
  const clickRef     = useRef(null);

  /* Expose imperative write/clear to parent */
  useImperativeHandle(ref, () => ({
    write: (data) => { try { termRef.current?.write(data); } catch {} },
    clear: () => { try { termRef.current?.clear(); termRef.current?.reset(); } catch {} },
  }), []);

  const fit = useCallback(() => {
    try {
      fitRef.current?.fit();
      if (termRef.current) onResize?.(termRef.current.cols, termRef.current.rows);
    } catch {}
  }, [onResize]);

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

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current  = fitAddon;

    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        term.focus();
        onResize?.(term.cols, term.rows);
      } catch {}
    });

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

    clickRef.current = () => term.focus();
    containerRef.current.addEventListener("click", clickRef.current);
  }, [onInput, onResize]);

  useEffect(() => {
    init();
    const node = containerRef.current;
    return () => {
      if (node && clickRef.current) node.removeEventListener("click", clickRef.current);
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current  = null;
    };
  }, [init]);

  useEffect(() => {
    const handler = debounce(fit, 150);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [fit]);

  useEffect(() => {
    if (!termRef.current) return;
    try { fitRef.current?.fit(); termRef.current.focus(); onResize?.(termRef.current.cols, termRef.current.rows); } catch {}
  }, [focusSignal, onResize]);

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
});

export default TerminalPanel;
