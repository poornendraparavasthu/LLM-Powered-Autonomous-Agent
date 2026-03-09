import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export default function TerminalPanel({ output, isRunning, onInput }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLengthRef = useRef(0);

  // 🔹 Initialize xterm once
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

    // Forward user input to backend
    term.onData((data) => {
      if (isRunning) {
        onInput?.(data);
      }
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    lastLengthRef.current = 0;
  }, [onInput, isRunning]);

  useEffect(() => {
    initTerminal();

    return () => {
      termRef.current?.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      lastLengthRef.current = 0;
    };
  }, [initTerminal]);

  // 🔹 Stream only new output
  useEffect(() => {
    if (!termRef.current) return;

    const newContent = output.slice(lastLengthRef.current);

    if (newContent) {
      termRef.current.write(newContent);
      lastLengthRef.current = output.length;
    }
  }, [output]);

  // 🔹 Reset terminal when new command starts
  useEffect(() => {
    if (!output && termRef.current) {
      termRef.current.clear();
      lastLengthRef.current = 0;
    }
  }, [output]);

  // 🔹 Resize handling
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
    <div className="relative mt-2 rounded-lg overflow-hidden border border-[#2a2a3e] animate-in fade-in slide-in-from-top-2 duration-300">
      {isRunning && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-2 py-1 rounded bg-[#1a1a2e]/90 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffaa00] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffaa00]" />
          </span>
          <span className="text-[#ffaa00] font-mono">Running...</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full"
        style={{ height: "220px", padding: "8px" }}
      />
    </div>
  );
}