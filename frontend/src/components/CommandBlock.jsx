import { useState } from "react";
import { Play, HelpCircle } from "lucide-react";

export default function CommandBlock({ command, onRun, onExplain }) {

  const [explanation, setExplanation] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  /*
  ---------------------------------------
  RUN COMMAND
  ---------------------------------------
  */

  const handleRun = () => {

    if (!command || running) return;

    setRunning(true);

    try {
      onRun(command);
    } finally {
      setTimeout(() => setRunning(false), 300);
    }

  };

  /*
  ---------------------------------------
  EXPLAIN COMMAND
  ---------------------------------------
  */

  const handleExplain = async () => {

    if (loading) return;

    /* explanation already cached */

    if (explanation) {
      setShowExplanation(prev => !prev);
      return;
    }

    setLoading(true);

    try {

      const result = await onExplain(command);

      setExplanation(result);
      setShowExplanation(true);

    } catch {

      setExplanation("Failed to generate explanation.");
      setShowExplanation(true);

    }

    setLoading(false);
  };

  return (

    <div className="group space-y-2">

      {/* Command Row */}

      <div className="
        flex items-center gap-3
        p-3 rounded-lg
        bg-[#0a0a0f]
        border border-[#2a2a3e]
        hover:border-[#00ff88]/30
        transition-all duration-200
      ">

        {/* Command */}

        <code className="
          flex-1
          text-sm
          font-mono
          text-[#e0e0e0]
          break-all
          select-all
        ">
          <span className="text-[#00ff88]/60 mr-2">$</span>
          {command}
        </code>

        {/* Explain Button */}

        <button
          onClick={handleExplain}
          disabled={loading}
          className="
            flex items-center gap-1.5
            px-3 py-1.5
            rounded-md
            text-xs font-semibold
            transition-all duration-200
            shrink-0
            bg-[#2a2f45]
            text-[#9ad0ff]
            hover:bg-[#3a4265]
            disabled:opacity-50
          "
        >
          <HelpCircle className="w-3 h-3" />
          {loading ? "Loading..." : "Explain"}
        </button>

        {/* Run Button */}

        <button
          onClick={handleRun}
          disabled={running}
          className="
            flex items-center gap-1.5
            px-3 py-1.5
            rounded-md
            text-xs font-semibold
            transition-all duration-200
            shrink-0
            bg-[#00ff88]/10
            text-[#00ff88]
            hover:bg-[#00ff88]/20
            hover:shadow-[0_0_12px_rgba(0,255,136,0.15)]
            active:scale-95
            disabled:opacity-50
          "
        >
          <Play className="w-3 h-3" />
          {running ? "Running..." : "Run"}
        </button>

      </div>

      {/* Explanation Panel */}

      <div
        className={`
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${showExplanation ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
        `}
      >

        {explanation && (

          <div className="
            p-3 rounded-lg
            bg-[#10141f]
            border border-[#2a2a3e]
            text-sm
            text-[#b7f5b1]
            font-mono
            leading-relaxed
          ">
            {explanation}
          </div>

        )}

      </div>

    </div>

  );

}