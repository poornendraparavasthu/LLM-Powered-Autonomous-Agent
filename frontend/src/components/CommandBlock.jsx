import { useState, useCallback, useEffect } from "react";
import { Play, ChevronDown, ChevronUp, Square } from "lucide-react";
import TerminalPanel from "./TerminalPanel";

export default function CommandBlock({
  command,
  isActiveTerminal,
  terminalOutput,
  isRunning,
  onRun,
  onTerminalInput,
}) {
  const [showOutput, setShowOutput] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [savedOutput, setSavedOutput] = useState("");

  const handleRun = useCallback(() => {
    setHasCompleted(false);
    setSavedOutput("");
    setShowOutput(false);
    onRun(command);
  }, [command, onRun]);

  const shouldShowTerminal =
    isActiveTerminal && (isRunning || terminalOutput);

  // ✅ Properly detect completion
  useEffect(() => {
    if (!isRunning && isActiveTerminal && terminalOutput && !hasCompleted) {
      const timer = setTimeout(() => {
        setSavedOutput(terminalOutput);
        setHasCompleted(true);
        setShowOutput(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isRunning, isActiveTerminal, terminalOutput, hasCompleted]);

  return (
    <div className="group">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3e] hover:border-[#00ff88]/30 transition-all duration-200">
        <code className="flex-1 text-sm font-mono text-[#e0e0e0] break-all select-all">
          <span className="text-[#00ff88]/60 mr-2">$</span>
          {command}
        </code>

        <button
          onClick={handleRun}
          disabled={isRunning && isActiveTerminal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 shrink-0 ${
            isRunning && isActiveTerminal
              ? "bg-[#ffaa00]/20 text-[#ffaa00] cursor-not-allowed"
              : "bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 hover:shadow-[0_0_12px_rgba(0,255,136,0.15)] active:scale-95"
          }`}
        >
          {isRunning && isActiveTerminal ? (
            <>
              <Square className="w-3 h-3" />
              Running
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Run
            </>
          )}
        </button>
      </div>

      {/* Live Terminal */}
      {shouldShowTerminal && (
        <TerminalPanel
          output={terminalOutput}
          isRunning={isRunning}
          onInput={onTerminalInput}
        />
      )}

      {/* Saved Output After Completion */}
      {hasCompleted && savedOutput && !shouldShowTerminal && (
        <div className="mt-1">
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="flex items-center gap-1 text-xs text-[#888899] hover:text-[#00ff88] transition-colors px-2 py-1"
          >
            {showOutput ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {showOutput ? "Hide Output" : "View Output"}
          </button>

          {showOutput && (
            <TerminalPanel
              output={savedOutput}
              isRunning={false}
              onInput={onTerminalInput}
            />
          )}
        </div>
      )}
    </div>
  );
}