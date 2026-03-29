const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const blacklistEntries = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../config/blacklist.json"), "utf8")
);

function compileBlacklist(entries) {
  return entries.map(entry => ({
    ...entry,
    regex: new RegExp(entry.pattern, entry.flags || "")
  }));
}

// Add session validation utility
function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    throw new Error('Invalid session ID provided');
  }
  // Basic UUID format validation
  if (!/^[a-f0-9-]{36}$/.test(sessionId) && !/^session-/.test(sessionId)) {
    throw new Error('Session ID format invalid');
  }
  return true;
}

class CommandValidator {
  constructor({ llmService }) {
    this.llmService = llmService;
    this.blacklist = compileBlacklist(blacklistEntries);
  }

  syntaxValidation(command) {
    const result = spawnSync("bash", ["-n", "-c", command], {
      encoding: "utf8",
      timeout: 2_000
    });

    if (result.status !== 0) {
      return {
        status: "fail",
        reason: result.stderr?.trim() || "Command failed Bash syntax validation."
      };
    }

    return {
      status: "pass"
    };
  }

  blacklistValidation(command) {
    for (const rule of this.blacklist) {
      if (!rule.regex.test(command)) {
        continue;
      }

      return {
        status: rule.riskLevel === "high" ? "fail" : "confirm",
        ruleId: rule.id,
        category: rule.category,
        riskLevel: rule.riskLevel,
        reason: rule.description
      };
    }

    return {
      status: "pass"
    };
  }

  async semanticValidation({ command, explanation, history, provider }) {
    try {
      const result = await this.llmService.assessSemanticSafety({
        command,
        explanation,
        history,
        provider
      });

      const assessment = result.parsed;

      if (assessment.safe) {
        return {
          status: "pass",
          confidence: assessment.confidence,
          reason: assessment.reason,
          provider: result.provider
        };
      }

      if (
        /\brm\s+-[a-z]*[rf][a-z]*\b/i.test(command) ||
        /\bmkfs(\.[a-z0-9]+)?\b/i.test(command) ||
        /\bdd\b.*\bof=\/dev\//i.test(command)
      ) {
        return {
          status: "fail",
          confidence: assessment.confidence,
          reason: assessment.reason,
          provider: result.provider
        };
      }

      return {
        status: "confirm",
        confidence: assessment.confidence,
        reason: assessment.reason,
        provider: result.provider
      };
    } catch (error) {
      return {
        status: "confirm",
        confidence: 0.5,
        reason: "Semantic validation was uncertain, so confirmation is required.",
        provider: provider || "ollama"
      };
    }
  }

  async validateAll({ command, explanation, history, provider }) {
    const syntax = this.syntaxValidation(command);

    if (syntax.status === "fail") {
      return {
        valid: false,
        requiresConfirmation: false,
        validation: {
          syntax,
          blacklist: { status: "skipped" },
          semantic: { status: "skipped" }
        }
      };
    }

    const blacklist = this.blacklistValidation(command);

    if (blacklist.status === "fail") {
      return {
        valid: false,
        requiresConfirmation: false,
        validation: {
          syntax,
          blacklist,
          semantic: { status: "skipped" }
        }
      };
    }

    const semantic = await this.semanticValidation({
      command,
      explanation,
      history,
      provider
    });

    if (semantic.status === "fail") {
      return {
        valid: false,
        requiresConfirmation: false,
        validation: {
          syntax,
          blacklist,
          semantic
        }
      };
    }

    const requiresConfirmation =
      blacklist.status === "confirm" || semantic.status === "confirm";

    return {
      valid: true,
      requiresConfirmation,
      validation: {
        syntax,
        blacklist,
        semantic
      }
    };
  }
}

module.exports = { CommandValidator };
