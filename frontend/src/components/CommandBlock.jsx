import { useEffect, useState } from "react";
import { AlertCircle, Check, Clipboard, Info, Loader2, Play, TriangleAlert, X } from "lucide-react";

function vchipClass(status) {
  if (status === "pass")    return "vchip pass";
  if (status === "confirm") return "vchip confirm";
  if (status === "fail")    return "vchip fail";
  return "vchip";
}

function statusChip(status) {
  switch (status) {
    case "completed":     return <span className="chip chip-green"><Check className="h-2.5 w-2.5" />done</span>;
    case "running":       return <span className="chip chip-blue"><span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />running</span>;
    case "awaiting_input":return <span className="chip chip-yellow"><span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />waiting</span>;
    case "failed":        return <span className="chip chip-red"><X className="h-2.5 w-2.5" />failed</span>;
    case "blocked":       return <span className="chip chip-red"><X className="h-2.5 w-2.5" />blocked</span>;
    case "timed_out":     return <span className="chip chip-red">timed out</span>;
    default:              return <span className="chip">ready</span>;
  }
}

function riskChip(level) {
  if (level === "low")    return <span className="chip chip-green">low risk</span>;
  if (level === "medium") return <span className="chip chip-yellow">med risk</span>;
  if (level === "high")   return <span className="chip chip-red">high risk</span>;
  return null;
}

export default function CommandBlock({ result, onRun, onExplain, onCopy }) {
  const [explanation, setExplanation] = useState(result.explanation || "");
  const [showExplain, setShowExplain] = useState(Boolean(result.explanation));
  const [loadingExplain, setLoadingExplain] = useState(false);

  useEffect(() => {
    if (result.explanation) {
      setExplanation(result.explanation);
      setShowExplain(true);
    }
  }, [result.explanation]);

  const handleExplain = async () => {
    if (loadingExplain) return;
    if (explanation && showExplain) { setShowExplain(false); return; }
    if (explanation) { setShowExplain(true); return; }
    setLoadingExplain(true);
    try {
      const next = await onExplain?.(result.messageId, result.command);
      setExplanation(next || "No explanation available.");
      setShowExplain(true);
    } finally {
      setLoadingExplain(false);
    }
  };

  const canRun =
    result.status !== "running" &&
    result.status !== "blocked" &&
    result.status !== "awaiting_input" &&
    result.status !== "completed";

  const v = result.validation || {};

  return (
    <div className="cmd-block" data-risk={result.riskLevel}>
      {/* Command line */}
      <div className="cmd-code-row">
        <pre className="cmd-code">
          <span className="cmd-prompt">$</span>{result.command}
        </pre>
      </div>

      {/* Status + validation badges */}
      <div className="cmd-meta-row">
        {statusChip(result.status)}
        {riskChip(result.riskLevel)}
        {result.provider && (
          <>
            <span className="cmd-sep" />
            <span className="chip">
              {result.provider === "ollama" ? "local" : result.provider}
            </span>
          </>
        )}
        <span className="cmd-sep" />
        <span className={vchipClass(v.syntax?.status)}>
          <span className="vchip-dot" />syntax
        </span>
        <span className={vchipClass(v.blacklist?.status)}>
          <span className="vchip-dot" />blacklist
        </span>
        <span className={vchipClass(v.semantic?.status)}>
          <span className="vchip-dot" />semantic
        </span>
      </div>

      {/* Contextual notices */}
      {result.requiresConfirmation && result.status === "ready" && (
        <div className="cmd-notice cmd-notice-warn">
          <TriangleAlert className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>Requires confirmation — this command uses elevated privileges. Click <strong>Review & Run</strong> to inspect before running.</span>
        </div>
      )}

      {result.status === "blocked" && (
        <div className="cmd-notice cmd-notice-error">
          <X className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Blocked by validator.{" "}
            {v.blacklist?.reason || v.syntax?.reason || "Did not pass safety checks."}
          </span>
        </div>
      )}

      {result.status === "awaiting_input" && (
        <div className="cmd-notice cmd-notice-info">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>Waiting for input — type your sudo password in the terminal below and press Enter.</span>
        </div>
      )}

      {/* Explanation */}
      {showExplain && explanation && (
        <div className="cmd-explain-row">
          <p className="cmd-label">Explanation</p>
          <p style={{ margin: 0 }}>{explanation}</p>
        </div>
      )}

      {/* Alternatives */}
      {result.alternatives?.length > 0 && (
        <div className="cmd-alternatives">
          <p className="cmd-label" style={{ marginTop: "0.6rem" }}>Alternatives</p>
          {result.alternatives.map((alt) => (
            <div key={alt} className="cmd-alt-item">{alt}</div>
          ))}
        </div>
      )}

      {/* Diagnosis */}
      {result.diagnosis && (
        <div className="cmd-diagnosis">
          <p className="cmd-label">
            <AlertCircle className="inline h-3 w-3 mr-1 text-[hsl(var(--red))]" />
            Failure analysis
          </p>
          {result.diagnosis}
        </div>
      )}

      {/* Actions */}
      <div className="cmd-actions-row">
        <button className="cmd-btn" onClick={() => onCopy?.(result.command)}>
          <Clipboard className="h-3.5 w-3.5" />
          Copy
        </button>

        <button className="cmd-btn" onClick={handleExplain} disabled={loadingExplain}>
          {loadingExplain
            ? <Loader2 className="h-3.5 w-3.5 spin" />
            : <Info className="h-3.5 w-3.5" />}
          {loadingExplain ? "Loading" : showExplain && explanation ? "Hide" : "Explain"}
        </button>

        <button className="cmd-btn cmd-btn-run" onClick={() => onRun?.(result)} disabled={!canRun}>
          <Play className="h-3.5 w-3.5" />
          {result.requiresConfirmation ? "Review & Run" : "Run"}
        </button>
      </div>
    </div>
  );
}
