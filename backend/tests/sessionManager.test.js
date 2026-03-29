const test = require("node:test");
const assert = require("node:assert/strict");

const { SessionManager } = require("../services/SessionManager");

test("SessionManager stores history and commands per session", () => {
  const manager = new SessionManager({ ttlMs: 1000 });
  const sessionId = manager.createSessionId();

  manager.addHistory(sessionId, {
    instruction: "show files"
  });

  manager.storeCommand(sessionId, {
    messageId: "msg-1",
    instruction: "show files",
    command: "ls -la",
    provider: "ollama",
    riskLevel: "low",
    status: "ready"
  });

  assert.equal(manager.getHistory(sessionId).length, 1);
  assert.equal(manager.getCommand(sessionId, "msg-1").command, "ls -la");
  assert.equal(manager.getCommandHistory(sessionId).length, 1);
});
