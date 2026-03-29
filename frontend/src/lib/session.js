const SESSION_KEY = "linux-ai-assistant-session-id";

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);

  if (existing) {
    return existing;
  }

  const next = createSessionId();
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

export function resetSessionId() {
  const next = createSessionId();
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}
