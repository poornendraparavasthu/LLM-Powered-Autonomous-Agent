import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export default function TerminalPanel({ output, onInput }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLengthRef = useRef(0);

  const initTerminal = useCallback(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#0a0a0f",
        foreground: "#00ff88",
        cursor: "#00ff88",
        cursorAccent: "#0a0a0f",
        selectionBackground: "#00ff8833",
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {}
    });

    // Forward all user input
    term.onData((data) => {
      onInput?.(data);
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    lastLengthRef.current = 0;
  }, [onInput]);

  useEffect(() => {
    initTerminal();

    return () => {
      termRef.current?.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      lastLengthRef.current = 0;
    };
  }, [initTerminal]);

  // Stream new output only
  useEffect(() => {
    if (!termRef.current) return;

    const newContent = output.slice(lastLengthRef.current);

    if (newContent) {
      termRef.current.write(newContent);
      lastLengthRef.current = output.length;
    }
  }, [output]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      try {
        fitAddonRef.current?.fit();
      } catch {}
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="h-full w-full border-l border-[#2a2a3e] bg-[#0a0a0f]">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ padding: "0px" }}
      />
    </div>
  );
}