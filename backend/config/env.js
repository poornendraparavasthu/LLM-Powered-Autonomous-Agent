const path = require("path");

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOrigins(value) {
  return String(
    value || "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

const env = {
  port: parseInteger(process.env.PORT, 3000),
  host: process.env.HOST || "127.0.0.1",
  logLevel: process.env.LOG_LEVEL || "info",
  allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
  rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: parseInteger(process.env.RATE_LIMIT_MAX, 30),
  defaultProvider: process.env.LLM_PROVIDER || "ollama",
  ollamaUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "mistral",
  ollamaTimeoutMs: parseInteger(process.env.OLLAMA_TIMEOUT_MS, 10_000),
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  geminiTimeoutMs: parseInteger(process.env.GEMINI_TIMEOUT_MS, 12_000),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  executionTimeoutMs: parseInteger(process.env.EXECUTION_TIMEOUT_MS, 30_000),
  sessionTtlMs: parseInteger(process.env.SESSION_TTL_MS, 30 * 60_000),
  agentUser: process.env.AGENT_USER || process.env.USER || "agentuser",
  agentHome:
    process.env.AGENT_HOME ||
    process.env.HOME ||
    path.resolve(process.cwd(), "..", ".agent-workspace"),
  shellPath: process.env.SHELL || "/bin/bash",
  auditLogDir: path.resolve(process.cwd(), "logs")
};

module.exports = { env };
