import { AlertTriangle, Bot, TriangleAlert } from "lucide-react";
import CommandBlock from "./CommandBlock";

export default function ChatMessage({ entry, onRunCommand, onExplainCommand, onCopyCommand }) {
  const time = entry.timestamp
    ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  if (entry.role === "user") {
    return (
      <div className="msg-user fade-in">
        <div className="msg-user-bubble">{entry.content}</div>
      </div>
    );
  }

  if (entry.role === "error") {
    return (
      <div className="msg-ai fade-in">
        <div className="msg-avatar msg-error-avatar">
          <TriangleAlert className="h-3.5 w-3.5" />
        </div>
        <div className="msg-ai-content">
          <p className="msg-error-text">{entry.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-ai fade-in">
      <div className="msg-avatar">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="msg-ai-content">
        {entry.content && (
          <p className="msg-ai-text">{entry.content}</p>
        )}
        {entry.result && (
          <CommandBlock
            result={entry.result}
            onRun={onRunCommand}
            onExplain={onExplainCommand}
            onCopy={onCopyCommand}
          />
        )}
      </div>
    </div>
  );
}
