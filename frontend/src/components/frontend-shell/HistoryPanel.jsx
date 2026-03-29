import { Clock } from "lucide-react";

function ago(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function statusColor(status) {
  if (status === "completed") return "hsl(var(--green))";
  if (status === "failed" || status === "blocked" || status === "timed_out") return "hsl(var(--red))";
  if (status === "running") return "hsl(var(--blue))";
  return "hsl(var(--ink-3))";
}

export default function HistoryPanel({ entries }) {
  const sorted = [...entries].reverse();

  return (
    <div className="panel overflow-hidden">
      <div className="pane-header">
        <span className="pane-title">History</span>
        {entries.length > 0 && (
          <span className="chip">{entries.length}</span>
        )}
      </div>

      <div
        className="overflow-y-auto p-3 space-y-2"
        style={{
          maxHeight: "320px",
          maskImage: "linear-gradient(180deg, black calc(100% - 28px), transparent 100%)",
        }}
      >
        {sorted.length === 0 ? (
          <p className="text-[0.8rem] py-4 text-center" style={{ color: "hsl(var(--ink-3))" }}>
            No commands yet
          </p>
        ) : (
          sorted.map((e) => (
            <div key={e.messageId} className="hist-item">
              {/* Top row */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[0.7rem] font-medium" style={{ color: statusColor(e.status) }}>
                  {e.status || "ready"}
                </span>
                <div className="flex items-center gap-1.5">
                  {e.riskLevel && (
                    <span className="text-[0.66rem]" style={{ color: "hsl(var(--ink-3))" }}>
                      {e.riskLevel}
                    </span>
                  )}
                  {e.createdAt && (
                    <span className="flex items-center gap-0.5 text-[0.65rem]" style={{ color: "hsl(var(--ink-3))" }}>
                      <Clock className="h-2.5 w-2.5" />
                      {ago(e.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Instruction */}
              <p className="text-[0.8rem] font-medium mb-1 line-clamp-1" style={{ color: "hsl(var(--ink))", margin: "0 0 4px" }}>
                {e.instruction}
              </p>

              {/* Command */}
              <div className="hist-cmd">$ {e.command}</div>

              {/* Exit code */}
              {e.exitCode !== null && e.exitCode !== undefined && (
                <p className="text-[0.64rem] mt-1.5" style={{ margin: "6px 0 0", color: e.exitCode === 0 ? "hsl(var(--green))" : "hsl(var(--red))" }}>
                  exit {e.exitCode}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
