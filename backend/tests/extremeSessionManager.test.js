const test = require("node:test");
const assert = require("node:assert/strict");

const { SessionManager } = require("../services/SessionManager");

/* ═══════════════════════════════════════════════════════════════════
   1. SESSION CREATION & LIFECYCLE
   ═══════════════════════════════════════════════════════════════════ */

test("creates unique session IDs (UUID format)", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const id1 = manager.createSessionId();
  const id2 = manager.createSessionId();
  assert.notEqual(id1, id2);
  assert.match(id1, /^[a-f0-9-]{36}$/);
  assert.match(id2, /^[a-f0-9-]{36}$/);
});

test("ensureSession creates a new session if missing", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sessionId = manager.createSessionId();
  const session = manager.ensureSession(sessionId);
  assert.equal(session.id, sessionId);
  assert.ok(Array.isArray(session.history));
  assert.equal(session.history.length, 0);
});

test("ensureSession returns existing session on second call", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sessionId = manager.createSessionId();
  const s1 = manager.ensureSession(sessionId);
  s1.history.push({ instruction: "test" });
  const s2 = manager.ensureSession(sessionId);
  assert.equal(s2.history.length, 1);
});

/* ═══════════════════════════════════════════════════════════════════
   2. HISTORY MANAGEMENT
   ═══════════════════════════════════════════════════════════════════ */

test("addHistory appends entries", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();
  manager.addHistory(sid, { instruction: "first" });
  manager.addHistory(sid, { instruction: "second" });
  const history = manager.getHistory(sid);
  assert.equal(history.length, 2);
  assert.equal(history[0].instruction, "first");
  assert.equal(history[1].instruction, "second");
});

test("addHistory caps at 40 entries (drops oldest)", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();

  for (let i = 0; i < 50; i++) {
    manager.addHistory(sid, { instruction: `command-${i}` });
  }

  const history = manager.getHistory(sid);
  assert.equal(history.length, 40);
  // Oldest entries (0-9) should be gone
  assert.equal(history[0].instruction, "command-10");
  assert.equal(history[39].instruction, "command-49");
});

test("getHistory returns a copy (not a reference)", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();
  manager.addHistory(sid, { instruction: "test" });
  const h1 = manager.getHistory(sid);
  h1.push({ instruction: "injected" });
  const h2 = manager.getHistory(sid);
  assert.equal(h2.length, 1, "Original history should not be modified");
});

/* ═══════════════════════════════════════════════════════════════════
   3. COMMAND STORAGE & RETRIEVAL
   ═══════════════════════════════════════════════════════════════════ */

test("storeCommand and getCommand round-trip", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();
  manager.storeCommand(sid, {
    messageId: "msg-1",
    instruction: "list files",
    command: "ls -la",
    provider: "ollama",
    riskLevel: "low",
    status: "ready"
  });
  const cmd = manager.getCommand(sid, "msg-1");
  assert.equal(cmd.command, "ls -la");
  assert.equal(cmd.status, "ready");
});

test("getCommand returns null for unknown messageId", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();
  assert.equal(manager.getCommand(sid, "nonexistent"), null);
});

test("updateCommand patches existing command", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();
  manager.storeCommand(sid, {
    messageId: "msg-1",
    command: "ls -la",
    status: "ready"
  });
  const updated = manager.updateCommand(sid, "msg-1", { status: "completed", exitCode: 0 });
  assert.equal(updated.status, "completed");
  assert.equal(updated.exitCode, 0);
  assert.equal(updated.command, "ls -la"); // original fields preserved
});

test("updateCommand returns null for unknown messageId", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();
  manager.ensureSession(sid);
  assert.equal(manager.updateCommand(sid, "ghost", { status: "done" }), null);
});

test("stores multiple commands in same session", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();

  for (let i = 0; i < 20; i++) {
    manager.storeCommand(sid, {
      messageId: `msg-${i}`,
      command: `echo ${i}`,
      status: "ready"
    });
  }

  const history = manager.getCommandHistory(sid);
  assert.equal(history.length, 20);
});

test("getCommandHistory returns commands sorted by newest first", async () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();

  manager.storeCommand(sid, { messageId: "first", command: "echo 1", status: "ready" });
  // Need actual time gap for different Date.now() values
  await new Promise(resolve => setTimeout(resolve, 10));
  manager.storeCommand(sid, { messageId: "second", command: "echo 2", status: "ready" });

  const history = manager.getCommandHistory(sid);
  assert.equal(history.length, 2);
  // Most recent should be first
  assert.equal(history[0].messageId, "second");
});

/* ═══════════════════════════════════════════════════════════════════
   4. SESSION EXPIRY & CLEANUP
   ═══════════════════════════════════════════════════════════════════ */

test("expired sessions get cleaned up", async () => {
  const manager = new SessionManager({ ttlMs: 50 }); // 50ms TTL
  const sid = manager.createSessionId();
  manager.ensureSession(sid);
  manager.addHistory(sid, { instruction: "test" });

  // Wait for TTL to expire
  await new Promise(resolve => setTimeout(resolve, 100));

  // Creating a new session triggers cleanup
  const newSid = manager.createSessionId();
  manager.ensureSession(newSid);

  // Old session should be gone — ensureSession creates a fresh one
  const history = manager.getHistory(sid);
  assert.equal(history.length, 0, "Expired session should have been cleaned up");
});

test("clearSession removes specific session", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid = manager.createSessionId();
  manager.addHistory(sid, { instruction: "test" });
  manager.clearSession(sid);

  // Accessing after clear creates a new empty session
  const history = manager.getHistory(sid);
  assert.equal(history.length, 0);
});

/* ═══════════════════════════════════════════════════════════════════
   5. CONCURRENT SESSION ISOLATION
   ═══════════════════════════════════════════════════════════════════ */

test("multiple sessions are isolated from each other", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sid1 = manager.createSessionId();
  const sid2 = manager.createSessionId();

  manager.addHistory(sid1, { instruction: "session-1-only" });
  manager.storeCommand(sid1, { messageId: "m1", command: "ls", status: "ready" });

  manager.addHistory(sid2, { instruction: "session-2-only" });
  manager.storeCommand(sid2, { messageId: "m2", command: "pwd", status: "ready" });

  assert.equal(manager.getHistory(sid1).length, 1);
  assert.equal(manager.getHistory(sid2).length, 1);
  assert.equal(manager.getHistory(sid1)[0].instruction, "session-1-only");
  assert.equal(manager.getHistory(sid2)[0].instruction, "session-2-only");

  assert.equal(manager.getCommand(sid1, "m1").command, "ls");
  assert.equal(manager.getCommand(sid1, "m2"), null); // not in this session
  assert.equal(manager.getCommand(sid2, "m2").command, "pwd");
  assert.equal(manager.getCommand(sid2, "m1"), null); // not in this session
});

/* ═══════════════════════════════════════════════════════════════════
   6. STRESS TEST — many sessions
   ═══════════════════════════════════════════════════════════════════ */

test("handles 100 concurrent sessions", () => {
  const manager = new SessionManager({ ttlMs: 60_000 });
  const sessions = [];

  for (let i = 0; i < 100; i++) {
    const sid = manager.createSessionId();
    sessions.push(sid);
    manager.addHistory(sid, { instruction: `task-${i}` });
    manager.storeCommand(sid, { messageId: `msg-${i}`, command: `echo ${i}`, status: "ready" });
  }

  // Verify all sessions are intact
  for (let i = 0; i < 100; i++) {
    const history = manager.getHistory(sessions[i]);
    assert.equal(history.length, 1);
    assert.equal(history[0].instruction, `task-${i}`);
  }
});
