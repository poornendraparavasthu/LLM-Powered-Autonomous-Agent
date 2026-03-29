const test = require("node:test");
const assert = require("node:assert/strict");

const { createApiRouter } = require("../routes/createApiRouter");

function invokeRouter(router, { method, url, body = {}, query = {} }) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url,
      path: url,
      body,
      query,
      headers: {}
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({
          status: this.statusCode,
          body: payload
        });
        return this;
      }
    };

    router.handle(req, res, reject);
  });
}

function buildRouter() {
  return createApiRouter({
    llmService: {
      setupStatus: async () => ({
        defaultProvider: "ollama",
        system: {
          prettyName: "Arch Linux",
          packageManager: "pacman",
          packageExamples: {
            updateSystem: "sudo pacman -Syu"
          }
        },
        ollama: { available: true, models: [{ name: "mistral" }] },
        gemini: { available: false, error: "not configured" }
      }),
      listModels: async () => [{ name: "mistral" }],
      explainCommand: async () => ({
        provider: "ollama",
        explanation: "Lists files."
      })
    },
    sessionManager: {
      getCommandHistory: () => []
    },
    commandProcessor: {
      process: async ({ instruction }) => ({
        messageId: "msg-1",
        instruction,
        command: "ls -la",
        explanation: "Lists files.",
        riskLevel: "low",
        alternatives: [],
        provider: "ollama",
        validation: {
          syntax: { status: "pass" },
          blacklist: { status: "pass" },
          semantic: { status: "pass" }
        },
        requiresConfirmation: false,
        timeoutMs: 30000,
        status: "ready"
      }),
      execute: async () => ({
        started: true,
        messageId: "msg-1"
      }),
      clearSession: () => ({
        cleared: true
      })
    }
  });
}

test("API health endpoint reports the default provider", async () => {
  const router = buildRouter();
  const response = await invokeRouter(router, {
    method: "GET",
    url: "/health"
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.defaultProvider, "ollama");
});

test("API setup endpoint reports the detected host system", async () => {
  const router = buildRouter();
  const response = await invokeRouter(router, {
    method: "GET",
    url: "/setup"
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.system.prettyName, "Arch Linux");
  assert.equal(response.body.system.packageManager, "pacman");
});

test("API command endpoint returns a structured command result", async () => {
  const router = buildRouter();
  const response = await invokeRouter(router, {
    method: "POST",
    url: "/command",
    body: {
      instruction: "show files",
      sessionId: "9f4ec0b4-9051-4f7f-86e1-d4510284f464",
      provider: "ollama"
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.command, "ls -la");
  assert.equal(response.body.provider, "ollama");
});
