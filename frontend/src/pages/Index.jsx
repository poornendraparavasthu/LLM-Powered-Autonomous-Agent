import { useCallback, useEffect, useRef, useState } from "react";
import {
  Database,
  MemoryStick,
  Network,
  RefreshCw,
  Search,
  Settings,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiFetch } from "@/lib/api";
import { getSessionId, resetSessionId } from "@/lib/session";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TerminalPanel from "@/components/TerminalPanel";
import SettingsDrawer from "@/components/frontend-shell/SettingsDrawer";
import HistoryPanel from "@/components/frontend-shell/HistoryPanel";
import SetupPanel from "@/components/frontend-shell/SetupPanel";
import ConfirmModal from "@/components/frontend-shell/ConfirmModal";

function uid() {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem("cfg") || "null"); } catch { return null; }
}
function saveSettings(s) {
  try { localStorage.setItem("cfg", JSON.stringify(s)); } catch {}
}

const QUICK = [
  { label: "Disk usage",   sub: "df -h",          icon: Database },
  { label: "Memory info",  sub: "free -h",         icon: MemoryStick },
  { label: "Open ports",   sub: "ss -tulpn",       icon: Network },
  { label: "Find large files", sub: "> 100 MB",    icon: Search },
];

export default function Index() {
  const [sessionId,       setSessionId]       = useState(() => getSessionId());
  const [messages,        setMessages]        = useState([]);
  const termOutRef = useRef(""); // accumulates output for copy — no React state, no re-renders
  const [termStatus,      setTermStatus]      = useState("connecting");
  const [focusSig,        setFocusSig]        = useState(0);
  const [history,         setHistory]         = useState([]);
  const [setup,           setSetup]           = useState(null);
  const [models,          setModels]          = useState([]);
  const [settingsOpen,    setSettingsOpen]    = useState(false);
  const [pending,         setPending]         = useState(null);
  const [executing,       setExecuting]       = useState(false);
  const [settings, setSettings] = useState(() => loadSettings() || {
    provider: "ollama",
    model: "mistral",
  });

  const chatRef    = useRef(null);
  const termRef    = useRef(null);   // DOM ref for scrollIntoView
  const xtermRef   = useRef(null);   // imperative xterm handle (write / clear)

  /* ── helpers ── */
  const patchMsg = useCallback((messageId, patch) => {
    setMessages(prev => prev.map(m =>
      m.role === "assistant" && m.result?.messageId === messageId
        ? { ...m, result: { ...m.result, ...patch } }
        : m
    ));
  }, []);

  /* ── bootstrap ── */
  const fetchSetup = useCallback(async () => {
    try {
      const d = await apiFetch("/api/setup");
      setSetup(d);
      setSettings(p => ({ ...p, provider: d.defaultProvider || p.provider }));
    } catch {}
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const d = await apiFetch("/api/models");
      const list = d.models || [];
      setModels(list);
      if (!list.length) return;
      setSettings(p => {
        const names = list.map(m => m.name);
        const next = { ...p, model: names.includes(p.model) ? p.model : names[0] };
        saveSettings(next);
        return next;
      });
    } catch { setModels([]); }
  }, []);

  const fetchHistory = useCallback(async (sid = sessionId) => {
    try {
      const d = await apiFetch(`/api/session/history?sessionId=${sid}`);
      setHistory(d.history || []);
    } catch { setHistory([]); }
  }, [sessionId]);

  useEffect(() => {
    fetchSetup();
    fetchModels();
    fetchHistory(sessionId);
  }, [fetchSetup, fetchModels, fetchHistory, sessionId]);

  useEffect(() => { saveSettings(settings); }, [settings]);

  /* ── WebSocket ── */
  const { status, sendTerminalInput, sendTerminalResize, cancelCommand } = useWebSocket({
    sessionId,
    onReady:        () => fetchHistory(sessionId),
    onTerminalReady:(p) => setTermStatus(p?.status || "ready"),
    onOutput:       (p) => {
      xtermRef.current?.write(p.data);
      const next = termOutRef.current + p.data;
      termOutRef.current = next.length > 50_000 ? next.slice(-50_000) : next;
    },
    onExit: (p) => {
      patchMsg(p.messageId, {
        status: p.timedOut ? "timed_out" : p.exitCode === 0 ? "completed" : "failed",
        exitCode: p.exitCode,
      });
      fetchHistory(sessionId);
    },
    onStatus: (p) => {
      if (p.messageId) patchMsg(p.messageId, { status: p.status });
      if (p.status === "awaiting_input") {
        setFocusSig(n => n + 1);
        termRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        toast("Sudo password requested — type it in the terminal below.");
      }
      fetchHistory(sessionId);
    },
    onDiagnosis: (p) => {
      patchMsg(p.messageId, { diagnosis: p.diagnosis });
      toast("Failure analysis ready");
    },
  });

  /* auto-scroll chat */
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  /* ── actions ── */
  const handleSend = useCallback(async (text) => {
    if (executing) return;
    if (!settings.model) { toast.error("No model selected."); return; }
    setExecuting(true);

    setMessages(p => [...p, { id: uid(), role: "user", content: text, timestamp: new Date() }]);

    try {
      const result = await apiFetch("/api/command", {
        method: "POST",
        body: JSON.stringify({
          instruction: text,
          sessionId,
          provider: settings.provider,
          model: settings.model,

        }),
      });
      setMessages(p => [...p, { id: result.messageId, role: "assistant", content: null, timestamp: new Date(), result }]);
      fetchHistory(sessionId);
    } catch (err) {
      setMessages(p => [...p, { id: uid(), role: "error", content: err.message || "Command generation failed.", timestamp: new Date() }]);
    } finally {
      setExecuting(false);
    }
  }, [executing, settings, sessionId, fetchHistory]);

  const handleRun = useCallback(async (result, confirmed = false) => {
    if (!result) return;
    if (result.requiresConfirmation && !confirmed) { setPending(result); return; }

    try {
      await apiFetch("/api/command/execute", {
        method: "POST",
        body: JSON.stringify({ sessionId, messageId: result.messageId, confirmed }),
      });
      patchMsg(result.messageId, { status: /\bsudo\b/.test(result.command) ? "awaiting_input" : "running" });
      termOutRef.current = "";
      xtermRef.current?.clear();
      setFocusSig(n => n + 1);
      termRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPending(null);
      if (/\bsudo\b/.test(result.command)) toast("Started — sudo may prompt for a password in the terminal.");
      else toast("Running — output streaming to the terminal.");
      fetchHistory(sessionId);
    } catch (err) {
      toast.error(err.message || "Execution failed.");
    }
  }, [sessionId, patchMsg, fetchHistory]);

  const handleExplain = useCallback(async (messageId, command) => {
    try {
      const d = await apiFetch("/api/explain", { method: "POST", body: JSON.stringify({ command }) });
      patchMsg(messageId, { explanation: d.explanation });
      return d.explanation;
    } catch {
      toast.error("Explanation unavailable.");
      return "";
    }
  }, [patchMsg]);

  const handleCopy = useCallback(async (v) => {
    await navigator.clipboard.writeText(v);
    toast("Copied");
  }, []);

  const handleClearSession = useCallback(async () => {
    try {
      await apiFetch("/api/session/clear", { method: "POST", body: JSON.stringify({ sessionId }) });
      const next = resetSessionId();
      setSessionId(next);
      setMessages([]);
      setHistory([]);
      termOutRef.current = "";
      xtermRef.current?.clear();
      setPending(null);
      setExecuting(false);
      toast("Session cleared");
    } catch (err) {
      toast.error(err.message || "Failed.");
    }
  }, [sessionId]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "s" || e.key === "S") setSettingsOpen(v => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* derived */
  const latestAssistant = [...messages].reverse().find(m => m.role === "assistant");
  const latestCmd       = latestAssistant?.result?.command || "";
  const isRunning       = ["running", "awaiting_input"].includes(latestAssistant?.result?.status);
  const showSudoHint    = isRunning && /\bsudo\b/.test(latestCmd);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "hsl(var(--bg))" }}>

      {/* ── Navbar ────────────────────────────────────────── */}
      <nav className="navbar">
        {/* Logo */}
        <div className="logo-mark">AI</div>
        <span className="nav-title">Linux AI</span>
        <div className="nav-divider" />

        {/* Connection */}
        <div className="conn-badge">
          <span className={`conn-dot ${status}`} />
          {status === "connected" ? "connected" : status === "connecting" ? "connecting…" : "offline"}
        </div>

        {/* Model chip */}
        {settings.model && (
          <span className="chip" style={{ fontFamily: "'Geist Mono', monospace" }}>
            {settings.model}
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Buttons */}
        <button
          onClick={() => fetchHistory(sessionId)}
          className="nav-btn nav-btn-icon"
          title="Refresh history"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="nav-btn nav-btn-icon"
          title="Settings (S)"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </nav>

      {/* ── Body ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, padding: "1rem", gap: "1rem" }}>

        {/* Left: chat + input */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          background: "hsl(var(--surface))",
          border: "1px solid hsl(var(--line))",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          {/* Chat header */}
          <div className="pane-header">
            <span className="pane-title">Chat</span>
            <span className="chip">{messages.length} msg{messages.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="chat-area" style={{ flex: 1 }}>
            {messages.length === 0 ? (
              <div className="empty-view">
                <div>
                  <h2 className="empty-heading">What do you need?</h2>
                  <p className="empty-sub" style={{ marginTop: "0.5rem" }}>
                    Describe a Linux task in plain English. Ollama generates the command locally,
                    validation runs, and you review it before anything executes.
                  </p>
                </div>

                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] mb-2.5" style={{ color: "hsl(var(--ink-3))" }}>
                    Quick start
                  </p>
                  <div className="quick-grid">
                    {QUICK.map(({ label, sub, icon: Icon }) => (
                      <button
                        key={label}
                        className="quick-btn"
                        disabled={status !== "connected"}
                        onClick={() => handleSend(label)}
                      >
                        <span className="quick-btn-icon">
                          <Icon className="h-3 w-3" />
                        </span>
                        <span>
                          <span className="block text-[0.82rem] font-medium" style={{ color: "hsl(var(--ink))" }}>{label}</span>
                          <span className="block text-[0.72rem]" style={{ color: "hsl(var(--ink-3))", fontFamily: "'Geist Mono', monospace" }}>{sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map(m => (
                <ChatMessage
                  key={m.id}
                  entry={m}
                  onRunCommand={handleRun}
                  onExplainCommand={handleExplain}
                  onCopyCommand={handleCopy}
                />
              ))
            )}
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            connectionStatus={status}
            disabled={executing}
          />
        </div>

        {/* Right: sidebar */}
        <div style={{
          width: "280px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}>
          <SetupPanel setup={setup} />
          <HistoryPanel entries={history} />
        </div>
      </div>

      {/* ── Terminal ──────────────────────────────────────── */}
      <div
        ref={termRef}
        style={{
          margin: "0 1rem 1rem",
          height: "300px",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Terminal header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Terminal className="h-3.5 w-3.5" style={{ color: "hsl(var(--ink-3))" }} />
            <span className="pane-title">Terminal</span>
          </div>
          {termStatus && termStatus !== "connecting" && (
            <span className={`chip ${isRunning ? "chip-blue" : termStatus === "ready" ? "chip-green" : ""}`}>
              {termStatus}
            </span>
          )}
          {showSudoHint && (
            <span
              className="text-[0.75rem] rounded-md px-2.5 py-1"
              style={{
                background: "hsl(var(--yellow)/0.08)",
                border: "1px solid hsl(var(--yellow)/0.2)",
                color: "hsl(var(--yellow))"
              }}
            >
              sudo — type password in terminal ↓
            </span>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <TerminalPanel
            ref={xtermRef}
            onInput={sendTerminalInput}
            onResize={sendTerminalResize}
            status={termStatus}
            focusSignal={focusSig}
            onCopyOutput={async () => { await navigator.clipboard.writeText(termOutRef.current); toast("Output copied"); }}
            onCancel={cancelCommand}
            runningCommand={isRunning ? latestCmd : undefined}
          />
        </div>
      </div>

      {/* ── Overlays ──────────────────────────────────────── */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={patch => setSettings(p => ({ ...p, ...patch }))}
        models={models}
        onClearSession={handleClearSession}
      />

      <ConfirmModal
        open={Boolean(pending)}
        result={pending}
        onCancel={() => setPending(null)}
        onConfirm={() => handleRun(pending, true)}
      />
    </div>
  );
}
