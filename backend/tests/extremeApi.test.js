const test = require("node:test");
const assert = require("node:assert/strict");

const { createApiRouter } = require("../routes/createApiRouter");

/* ─── test harness ─── */

function invokeRouter(router, { method, url, body = {}, query = {} }) {
  return new Promise((resolve, reject) => {
    const req = { method, url, path: url, body, query, headers: {} };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; }
    };
    router.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, body: { error: "Not found" } });
    });
  });
}

function buildRouter(overrides = {}) {
  return createApiRouter({
    llmService: {
      setupStatus: async () => ({
        defaultProvider: "ollama",
        system: {
          prettyName: "Arch Linux",
          packageManager: "pacman",
          packageExamples: { updateSystem: "sudo pacman -Syu" }
        },
        ollama: { available: true, models: [{ name: "mistral" }, { name: "phi3" }] },
        gemini: { available: false, error: "not configured" }
      }),
      listModels: async () => [{ name: "mistral" }, { name: "phi3" }],
      explainCommand: async ({ command }) => ({
        provider: "ollama",
        explanation: `Explanation for: ${command}`
      }),
      ...overrides.llmService
    },
    sessionManager: {
      getCommandHistory: () => [],
      ...overrides.sessionManager
    },
    commandProcessor: {
      process: async ({ instruction, sessionId, provider, model }) => ({
        messageId: "msg-test",
        instruction,
        command: `echo '${instruction}'`,
        explanation: `Runs: ${instruction}`,
        riskLevel: "low",
        alternatives: [],
        provider: provider || "ollama",
        validation: {
          syntax: { status: "pass" },
          blacklist: { status: "pass" },
          semantic: { status: "pass" }
        },
        requiresConfirmation: false,
        timeoutMs: 30000,
        status: "ready"
      }),
      execute: async ({ messageId }) => ({ started: true, messageId }),
      clearSession: () => ({ cleared: true }),
      ...overrides.commandProcessor
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   1. HEALTH ENDPOINT
   ═══════════════════════════════════════════════════════════════════ */

test("GET /health returns 200 with provider info", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, { method: "GET", url: "/health" });
  assert.equal(res.status, 200);
  assert.equal(res.body.defaultProvider, "ollama");
});

/* ═══════════════════════════════════════════════════════════════════
   2. SETUP ENDPOINT
   ═══════════════════════════════════════════════════════════════════ */

test("GET /setup returns system profile with distro info", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, { method: "GET", url: "/setup" });
  assert.equal(res.status, 200);
  assert.equal(res.body.system.prettyName, "Arch Linux");
  assert.equal(res.body.system.packageManager, "pacman");
});

test("GET /setup includes provider availability", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, { method: "GET", url: "/setup" });
  assert.equal(res.body.ollama.available, true);
  assert.equal(res.body.gemini.available, false);
});

/* ═══════════════════════════════════════════════════════════════════
   3. COMMAND ENDPOINT — normal flow
   ═══════════════════════════════════════════════════════════════════ */

test("POST /command with valid instruction returns structured result", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: "list files",
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464",
      provider: "ollama"
    }
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.command);
  assert.ok(res.body.messageId);
  assert.equal(res.body.status, "ready");
});

test("POST /command echoes back the instruction", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: "show disk usage",
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464"
    }
  });
  assert.equal(res.body.instruction, "show disk usage");
});

test("POST /command with specific provider", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: "uptime",
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464",
      provider: "gemini"
    }
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.provider, "gemini");
});

/* ═══════════════════════════════════════════════════════════════════
   4. COMMAND ENDPOINT — error handling
   ═══════════════════════════════════════════════════════════════════ */

test("POST /command with LLM failure returns error", async () => {
  const router = buildRouter({
    commandProcessor: {
      process: async () => { throw new Error("Ollama is not running"); },
      execute: async () => ({ started: false }),
      clearSession: () => ({ cleared: true })
    }
  });
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: "hello",
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464"
    }
  });
  assert.ok(res.status >= 400 || res.body.error, "Should indicate error");
});

/* ═══════════════════════════════════════════════════════════════════
   5. MODELS ENDPOINT
   ═══════════════════════════════════════════════════════════════════ */

test("GET /models returns available model list", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, { method: "GET", url: "/models" });
  assert.equal(res.status, 200);
  assert.ok(res.body.models); // response is { models: [...] }
  assert.equal(res.body.models.length, 2);
  assert.equal(res.body.models[0].name, "mistral");
});

/* ═══════════════════════════════════════════════════════════════════
   6. EXPLAIN ENDPOINT
   ═══════════════════════════════════════════════════════════════════ */

test("POST /explain returns explanation for command", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/explain",
    body: { command: "ls -la", sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464" }
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.explanation);
});

/* ═══════════════════════════════════════════════════════════════════
   7. EXTREME INPUT — long instructions, special chars
   ═══════════════════════════════════════════════════════════════════ */

test("POST /command handles instruction near max length (1999 chars)", async () => {
  const router = buildRouter();
  const longInstruction = "install " + "a".repeat(1991); // exactly 1999 chars
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: longInstruction,
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464"
    }
  });
  assert.equal(res.status, 200);
});

test("POST /command rejects instruction over 2000 chars", async () => {
  const router = buildRouter();
  const tooLong = "a".repeat(2001);
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: tooLong,
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464"
    }
  });
  assert.equal(res.status, 400);
});

test("POST /command handles instruction with special characters", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: "create file with content <script>alert('xss')</script>",
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464"
    }
  });
  assert.equal(res.status, 200);
});

test("POST /command handles unicode instruction", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: "ファイルを作成する",
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464"
    }
  });
  assert.equal(res.status, 200);
});

/* ═══════════════════════════════════════════════════════════════════
   8. HISTORY ENDPOINT
   ═══════════════════════════════════════════════════════════════════ */

test("GET /session/history returns command history for session", async () => {
  const router = buildRouter({
    sessionManager: {
      getCommandHistory: () => [
        { messageId: "m1", instruction: "ls", command: "ls -la", status: "completed", exitCode: 0 },
        { messageId: "m2", instruction: "pwd", command: "pwd", status: "completed", exitCode: 0 }
      ]
    }
  });
  const res = await invokeRouter(router, {
    method: "GET",
    url: "/session/history",
    query: { sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464" }
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.history);
  assert.equal(res.body.history.length, 2);
});

test("GET /session/history returns empty array for fresh session", async () => {
  const router = buildRouter();
  const res = await invokeRouter(router, {
    method: "GET",
    url: "/session/history",
    query: { sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464" }
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.history);
  assert.equal(res.body.history.length, 0);
});
