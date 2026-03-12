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
  onRunCommand,
  onExplainCommand
}) {

  /*
  ---------------------------------------
  USER MESSAGE
  ---------------------------------------
  */

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

  /*
  ---------------------------------------
  ERROR MESSAGE
  ---------------------------------------
  */

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

  /*
  ---------------------------------------
  AI MESSAGE
  ---------------------------------------
  */

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

          {entry.distro && (
            <div className="flex items-center gap-3 flex-wrap">

              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[hsl(var(--surface))] border border-[hsl(var(--terminal)/0.3)] text-[hsl(var(--fg)/0.85)]">
                <Cpu className="w-4 h-4 text-[hsl(var(--cyan))]" />
                {entry.distro}
              </span>

            </div>
          )}

          {/* AI message text */}

          {entry.content && (
            <div className="terminal-window rounded-2xl rounded-tl-none px-5 py-4">
              <p className="text-[hsl(var(--fg))] text-base leading-relaxed">
                {entry.content}
              </p>
            </div>
          )}

          {/* Steps */}

          {entry.steps && entry.steps.length > 0 && (

            <div className="space-y-5">

              {entry.steps.map((step, stepIndex) => (

                <div
                  key={`${entry.id}-step-${stepIndex}`}
                  className="space-y-3"
                >

                  {/* Step Title */}

                  <div className="flex items-center gap-3">

                    <span className="text-sm font-semibold text-[hsl(var(--terminal))]">
                      Step {stepIndex + 1}
                    </span>

                    {step.risk && (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(step.risk)}`}
                      >
                        Risk: {step.risk}
                      </span>
                    )}

                  </div>

                  {/* Step task */}

                  <div className="terminal-window rounded-xl px-4 py-3 text-sm text-[hsl(var(--fg))]">
                    {step.task}
                  </div>

                  {/* Commands */}

                  {step.commands && step.commands.map((cmd, cmdIndex) => {

                    const commandId = `${entry.id}-step-${stepIndex}-cmd-${cmdIndex}`;

                    return (
                      <CommandBlock
                        key={commandId}
                        command={cmd}
                        onRun={() => onRunCommand(cmd)}
                        onExplain={() => onExplainCommand(cmd)}
                      />
                    );

                  })}

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}