export default function SetupPanel({ setup }) {
  const ollamaOk = Boolean(setup?.ollama?.available);
  const geminiOk = Boolean(setup?.gemini?.available);
  const systemOk = Boolean(setup?.system?.prettyName);
  const models   = setup?.ollama?.models?.length || 0;

  return (
    <div className="panel overflow-hidden">
      <div className="pane-header">
        <span className="pane-title">Environment</span>
        {setup && (
          <span className={`chip ${ollamaOk ? "chip-green" : "chip-red"}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
            {ollamaOk ? "ready" : "degraded"}
          </span>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        {/* Ollama */}
        <div className="side-row" style={{ background: ollamaOk ? "hsl(var(--green)/0.06)" : "hsl(var(--surface-2))" }}>
          <span className={`side-dot ${ollamaOk ? "ok" : "offline"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[0.82rem] font-medium" style={{ color: "hsl(var(--ink))", margin: 0 }}>Ollama</p>
            <p className="text-[0.72rem]" style={{ color: "hsl(var(--ink-2))", margin: 0 }}>
              {ollamaOk
                ? `${models} model${models !== 1 ? "s" : ""} · primary provider`
                : setup?.ollama?.error || "not responding on :11434"}
            </p>
          </div>
          {ollamaOk && <span className="chip chip-green" style={{ fontSize: "0.62rem" }}>local</span>}
        </div>

        {/* Gemini */}
        <div className="side-row" style={{ background: "hsl(var(--surface-2))" }}>
          <span className={`side-dot ${geminiOk ? "ok" : "warn"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[0.82rem] font-medium" style={{ color: "hsl(var(--ink))", margin: 0 }}>Gemini</p>
            <p className="text-[0.72rem]" style={{ color: "hsl(var(--ink-2))", margin: 0 }}>
              {geminiOk ? "backup only — used if Ollama is down" : "not configured"}
            </p>
          </div>
          <span className="chip" style={{ fontSize: "0.62rem" }}>backup</span>
        </div>

        {/* System */}
        <div className="side-row" style={{ background: "hsl(var(--surface-2))" }}>
          <span className={`side-dot ${systemOk ? "ok" : "warn"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[0.82rem] font-medium" style={{ color: "hsl(var(--ink))", margin: 0 }}>
              {setup?.system?.prettyName || "System"}
            </p>
            <p className="text-[0.72rem]" style={{ color: "hsl(var(--ink-2))", margin: 0 }}>
              {setup?.system?.packageManager
                ? `${setup.system.packageManager} · ${setup.system.packageExamples?.updateSystem || ""}`
                : "detecting…"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
