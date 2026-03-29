const { randomUUID } = require("crypto");

class SessionManager {
  constructor({ ttlMs }) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
  }

  createSessionId() {
    return randomUUID();
  }

  ensureSession(sessionId) {
    this.cleanupExpired();

    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        history: [],
        commands: new Map()
      });
    }

    const session = this.sessions.get(sessionId);
    session.updatedAt = Date.now();
    return session;
  }

  getHistory(sessionId) {
    return [...this.ensureSession(sessionId).history];
  }

  addHistory(sessionId, entry) {
    const session = this.ensureSession(sessionId);
    session.history.push({
      id: entry.id || randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry
    });

    if (session.history.length > 40) {
      session.history = session.history.slice(-40);
    }

    session.updatedAt = Date.now();
  }

  storeCommand(sessionId, commandResult) {
    const session = this.ensureSession(sessionId);
    session.commands.set(commandResult.messageId, {
      ...commandResult,
      createdAt: Date.now()
    });
    session.updatedAt = Date.now();
  }

  updateCommand(sessionId, messageId, patch) {
    const session = this.ensureSession(sessionId);
    const current = session.commands.get(messageId);

    if (!current) {
      return null;
    }

    const next = {
      ...current,
      ...patch,
      updatedAt: Date.now()
    };

    session.commands.set(messageId, next);
    session.updatedAt = Date.now();
    return next;
  }

  getCommand(sessionId, messageId) {
    return this.ensureSession(sessionId).commands.get(messageId) || null;
  }

  getCommandHistory(sessionId) {
    const session = this.ensureSession(sessionId);

    return [...session.commands.values()]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(command => ({
        messageId: command.messageId,
        instruction: command.instruction,
        command: command.command,
        provider: command.provider,
        riskLevel: command.riskLevel,
        status: command.status,
        createdAt: command.createdAt,
        updatedAt: command.updatedAt,
        exitCode: command.exitCode ?? null
      }));
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  cleanupExpired() {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > this.ttlMs) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

module.exports = { SessionManager };
