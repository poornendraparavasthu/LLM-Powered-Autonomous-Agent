const test = require("node:test");
const assert = require("node:assert/strict");

const { CommandValidator } = require("../services/CommandValidator");

test("CommandValidator blocks dangerous blacklist matches", async () => {
  const validator = new CommandValidator({
    llmService: {
      assessSemanticSafety: async () => ({
        provider: "ollama",
        parsed: {
          safe: true,
          confidence: 0.99,
          reason: "Looks safe"
        }
      })
    }
  });

  const result = await validator.validateAll({
    command: "rm -rf /",
    explanation: "remove everything",
    history: [],
    provider: "ollama"
  });

  assert.equal(result.valid, false);
  assert.equal(result.validation.blacklist.status, "fail");
});

test("CommandValidator requests confirmation for uncertain semantic checks", async () => {
  const validator = new CommandValidator({
    llmService: {
      assessSemanticSafety: async () => ({
        provider: "ollama",
        parsed: {
          safe: false,
          confidence: 0.4,
          reason: "Could modify important state"
        }
      })
    }
  });

  const result = await validator.validateAll({
    command: "systemctl restart nginx",
    explanation: "restart nginx",
    history: [],
    provider: "ollama"
  });

  assert.equal(result.valid, true);
  assert.equal(result.requiresConfirmation, true);
});

test("CommandValidator allows sudo commands with confirmation instead of blocking them", async () => {
  const validator = new CommandValidator({
    llmService: {
      assessSemanticSafety: async () => ({
        provider: "ollama",
        parsed: {
          safe: false,
          confidence: 0.98,
          reason: "Requires administrator privileges."
        }
      })
    }
  });

  const result = await validator.validateAll({
    command: "sudo systemctl restart nginx",
    explanation: "restart nginx",
    history: [],
    provider: "ollama"
  });

  assert.equal(result.valid, true);
  assert.equal(result.requiresConfirmation, true);
  assert.equal(result.validation.blacklist.status, "confirm");
});
