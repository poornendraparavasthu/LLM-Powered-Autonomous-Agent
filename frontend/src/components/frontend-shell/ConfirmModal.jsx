import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Play, X } from "lucide-react";

export default function ConfirmModal({ open, result, onCancel, onConfirm }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => confirmRef.current?.focus());
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open || !result) return null;

  const v = result.validation || {};
  const hasSudo = /\bsudo\b/.test(result.command);

  return createPortal(
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onCancel} />

      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "hsl(var(--yellow)/0.12)", border: "1px solid hsl(var(--yellow)/0.3)", color: "hsl(var(--yellow))" }}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] mb-0.5" style={{ color: "hsl(var(--ink-2))" }}>
                Execution review
              </p>
              <h2 className="text-[0.95rem] font-semibold m-0" style={{ color: "hsl(var(--ink))" }}>
                Confirm before running
              </h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-7 h-7 rounded-md"
            style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--line))", color: "hsl(var(--ink-2))" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Metadata row */}
          <div className="flex flex-wrap gap-2">
            <span className="chip">
              {result.provider === "ollama" ? "local" : result.provider}
            </span>
            {result.riskLevel === "high" && <span className="chip chip-red">{result.riskLevel} risk</span>}
            {result.riskLevel === "medium" && <span className="chip chip-yellow">{result.riskLevel} risk</span>}
            {result.riskLevel === "low" && <span className="chip chip-green">{result.riskLevel} risk</span>}
          </div>

          {/* Command */}
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "hsl(var(--ink-3))" }}>
              Command to run
            </p>
            <div
              className="rounded-lg p-3"
              style={{ background: "hsl(var(--term-bg))", border: "1px solid hsl(var(--line))" }}
            >
              <pre className="cmd-code m-0">
                <span className="cmd-prompt">$</span>{result.command}
              </pre>
            </div>
          </div>

          {/* Validation reasons */}
          {(v.blacklist?.reason || v.semantic?.reason) && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--line))" }}
            >
              {v.blacklist?.reason && (
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "hsl(var(--ink-3))" }}>Blacklist</p>
                  <p className="text-[0.82rem] m-0" style={{ color: "hsl(var(--ink-2))" }}>{v.blacklist.reason}</p>
                </div>
              )}
              {v.semantic?.reason && (
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "hsl(var(--ink-3))" }}>Semantic</p>
                  <p className="text-[0.82rem] m-0" style={{ color: "hsl(var(--ink-2))" }}>{v.semantic.reason}</p>
                </div>
              )}
            </div>
          )}

          {/* Sudo hint */}
          {hasSudo && (
            <p className="text-[0.82rem] rounded-lg p-3 m-0" style={{
              background: "hsl(var(--blue)/0.06)",
              border: "1px solid hsl(var(--blue)/0.2)",
              color: "hsl(var(--ink-2))"
            }}>
              After confirming, the page will scroll to the terminal. If sudo prompts for a password, type it there — it won't be shown on screen.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onCancel} className="cmd-btn">Cancel</button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="cmd-btn cmd-btn-run"
          >
            <Play className="h-3.5 w-3.5" />
            Run now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
