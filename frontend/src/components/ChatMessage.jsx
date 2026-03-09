import { Bot, User, AlertTriangle, Cpu } from "lucide-react";
import CommandBlock from "./CommandBlock";

function getRiskColor(risk) {
  switch (risk?.toLowerCase()) {
    case "high":
      return "bg-[hsl(var(--red)/0.15)] text-[hsl(var(--red))] border-[hsl(var(--red)/0.45)] crt-glow";
    case "medium":
      return "bg-[hsl(var(--yellow)/0.15)] text-[hsl(var(--yellow))] border-[hsl(var(--yellow)/0.45)] crt-glow";
    case "low":
    default:
      return "bg-[hsl(var(--terminal)/0.15)] text-[hsl(var(--terminal))] border-[hsl(var(--terminal)/0.45)] crt-glow";
  }
}

export default function ChatMessage({
  entry,
  activeCommandId,
  terminalOutput,
  isRunning,
  onRunCommand,
  onTerminalInput,
}) {
  if (entry.role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-start gap-4 max-w-[80%]">
          <div className="terminal-window rounded-2xl rounded-tr-none px-5 py-4 shadow-lg">
            <p className="text-[hsl(var(--fg))] text-base leading-relaxed">
              {entry.content}
            </p>
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--surface))] border border-[hsl(var(--terminal)/0.35)] flex items-center justify-center crt-glow">
            <User className="w-5 h-5 text-[hsl(var(--cyan))]" />
          </div>
        </div>
      </div>
    );
  }

  if (entry.role === "error") {
    return (
      <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="flex items-start gap-4 max-w-[80%]">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--red)/0.2)] border border-[hsl(var(--red)/0.45)] flex items-center justify-center crt-glow">
            <AlertTriangle className="w-5 h-5 text-[hsl(var(--red))]" />
          </div>
          <div className="terminal-window rounded-2xl rounded-tl-none px-5 py-4 border-[hsl(var(--red)/0.4)]">
            <p className="text-[hsl(var(--red))] text-base leading-relaxed">
              {entry.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex items-start gap-4 max-w-[85%] w-full">
        {/* Bot avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--terminal)/0.12)] border border-[hsl(var(--terminal)/0.35)] flex items-center justify-center crt-glow">
          <Bot className="w-5 h-5 text-[hsl(var(--terminal))]" />
        </div>

        {/* Message body */}
        <div className="flex-1 space-y-4">
          {/* Tags */}
          {(entry.distro || entry.risk) && (
            <div className="flex items-center gap-3 flex-wrap">
              {entry.distro && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[hsl(var(--surface))] border border-[hsl(var(--terminal)/0.3)] text-[hsl(var(--fg)/0.85)]">
                  <Cpu className="w-4 h-4 text-[hsl(var(--cyan))]" />
                  {entry.distro}
                </span>
              )}
              {entry.risk && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(entry.risk)}`}
                >
                  Risk: {entry.risk}
                </span>
              )}
            </div>
          )}

          {/* Content */}
          {entry.content && (
            <div className="terminal-window rounded-2xl rounded-tl-none px-5 py-4">
              <p className="text-[hsl(var(--fg))] text-base leading-relaxed">
                {entry.content}
              </p>
            </div>
          )}

          {/* Commands */}
          {entry.commands && entry.commands.length > 0 && (
            <div className="space-y-3">
              {entry.commands.map((cmd, idx) => {
                const commandId = `${entry.id}-cmd-${idx}`;
                return (
                  <CommandBlock
                    key={commandId}
                    command={cmd}
                    isActiveTerminal={activeCommandId === commandId}
                    terminalOutput={
                      activeCommandId === commandId ? terminalOutput : ""
                    }
                    isRunning={isRunning && activeCommandId === commandId}
                    onRun={() => onRunCommand(cmd, commandId)}
                    onTerminalInput={onTerminalInput}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}