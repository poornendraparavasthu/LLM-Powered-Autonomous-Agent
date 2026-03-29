import { useEffect } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";

export default function SettingsDrawer({ open, onClose, settings, onChange, models, onClearSession }) {
  const timeoutSecs = Math.round(settings.timeout / 1000);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={`drawer ${open ? "" : "pointer-events-none"}`}>
      <div
        className="drawer-backdrop"
        onClick={onClose}
        style={{ opacity: open ? 1 : 0, transition: "opacity 240ms" }}
      />
      <div
        className="drawer-panel"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="drawer-header">
          <span className="pane-title">Settings</span>
          <button onClick={onClose} className="drawer-close-btn" title="Esc">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Provider */}
          <div className="drawer-section">
            <p className="drawer-section-label">Provider</p>
            <div className="drawer-info-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="provider-dot ok" />
                  <span className="text-[0.85rem] font-medium" style={{ color: "hsl(var(--ink))" }}>Ollama</span>
                </div>
                <span className="chip chip-green" style={{ fontSize: "0.62rem" }}>primary</span>
              </div>
              <p className="text-[0.76rem] mt-2 mb-0" style={{ color: "hsl(var(--ink-3))", lineHeight: 1.55 }}>
                Commands generated locally. Gemini is used only if Ollama is completely unreachable.
              </p>
            </div>
          </div>

          <div className="drawer-divider" />

          {/* Model */}
          <div className="drawer-section">
            <div className="flex items-center justify-between mb-2.5">
              <p className="drawer-section-label" style={{ marginBottom: 0 }}>Model</p>
              {models.length > 0 && (
                <span className="chip" style={{ fontSize: "0.62rem" }}>{models.length} available</span>
              )}
            </div>
            <div className="select-wrap">
              <select
                value={settings.model || ""}
                onChange={(e) => onChange({ model: e.target.value })}
                className="select-field"
              >
                {(models.length ? models : [{ name: settings.model || "mistral" }]).map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="select-chevron h-3.5 w-3.5" />
            </div>
            {!models.length && (
              <p className="text-[0.72rem] mt-2 mb-0" style={{ color: "hsl(var(--yellow))" }}>
                Ollama not responding — model list unavailable.
              </p>
            )}
          </div>

          <div className="drawer-divider" />

          {/* Timeout */}
          <div className="drawer-section">
            <div className="flex items-center justify-between mb-3">
              <p className="drawer-section-label" style={{ marginBottom: 0 }}>Timeout</p>
              <span
                className="font-mono font-medium"
                style={{ fontSize: "0.85rem", color: "hsl(var(--ink))" }}
              >
                {timeoutSecs}s
              </span>
            </div>
            <input
              type="range"
              min="5" max="120" step="5"
              value={timeoutSecs}
              onChange={(e) => onChange({ timeout: Number(e.target.value) * 1000 })}
              className="slider w-full"
            />
            <div className="flex justify-between mt-2">
              <span className="text-[0.63rem]" style={{ color: "hsl(var(--ink-3))" }}>5s</span>
              <span className="text-[0.63rem]" style={{ color: "hsl(var(--ink-3))" }}>120s</span>
            </div>
          </div>

          <div className="drawer-divider" />

          {/* Session */}
          <div className="drawer-section">
            <p className="drawer-section-label">Session</p>
            <button onClick={onClearSession} className="danger-btn">
              <Trash2 className="h-3.5 w-3.5" />
              Clear session
            </button>
            <p className="text-[0.72rem] mt-2 mb-0" style={{ color: "hsl(var(--ink-3))", lineHeight: 1.55 }}>
              Clears messages, history, and terminal output. A new session ID is assigned.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <span className="text-[0.68rem]" style={{ color: "hsl(var(--ink-3))" }}>
            Press <kbd className="kbd">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
