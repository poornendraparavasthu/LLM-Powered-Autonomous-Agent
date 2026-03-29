const { randomUUID } = require("crypto");

const { logAudit, logError } = require("../config/logger");
const { applyInstructionHeuristics } = require("./commandHeuristics");

class CommandProcessor {
  constructor({
    sessionManager,
    llmService,
    validator,
    terminalManager,
    io,
    systemProfile
  }) {
    this.sessionManager = sessionManager;
    this.llmService = llmService;
    this.validator = validator;
    this.terminalManager = terminalManager;
    this.io = io;
    this.systemProfile = systemProfile;
  }

  buildResult({ instruction, generated, validation, timeoutMs }) {
    return {
      messageId: randomUUID(),
      instruction,
      command: generated.parsed.command,
      explanation: generated.parsed.explanation,
      riskLevel: generated.parsed.riskLevel,
      alternatives: generated.parsed.alternatives,
      provider: generated.provider,
      validation: validation.validation,
      requiresConfirmation: validation.requiresConfirmation,
      timeoutMs,
      status: validation.valid ? "ready" : "blocked"
    };
  }

  async generateWithRareBackup({ instruction, history, provider, model }) {
    const primary = await this.llmService.generateCommand({
      instruction,
      history,
      provider,
      model
    });

    return {
      ...primary,
      parsed: applyInstructionHeuristics(
        instruction,
        primary.parsed,
        this.systemProfile?.getSnapshot?.()
      )
    };
  }

  async process({ instruction, sessionId, provider, model, timeoutMs }) {
    const history = this.sessionManager.getHistory(sessionId);
    let generated = await this.generateWithRareBackup({
      instruction,
      history,
      provider,
      model
    });

    const validation = await this.validator.validateAll({
      command: generated.parsed.command,
      explanation: generated.parsed.explanation,
      history,
      provider: generated.provider
    });

    const result = this.buildResult({
      instruction,
      generated,
      validation,
      timeoutMs
    });

    this.sessionManager.storeCommand(sessionId, result);
    this.sessionManager.addHistory(sessionId, {
      type: "command",
      instruction,
      result
    });

    logAudit({
      event: "command.generated",
      sessionId,
      messageId: result.messageId,
      provider: result.provider,
      command: result.command,
      riskLevel: result.riskLevel,
      status: result.status
    });

    return result;
  }

  async execute({ sessionId, messageId, confirmed }) {
    const pending = this.sessionManager.getCommand(sessionId, messageId);

    if (!pending) {
      throw new Error("Command result not found for this session.");
    }

    if (pending.status === "blocked") {
      throw new Error("Blocked commands cannot be executed.");
    }

    if (pending.requiresConfirmation && !confirmed) {
      throw new Error("Confirmation is required before execution.");
    }

    this.sessionManager.updateCommand(sessionId, messageId, {
      status: "running"
    });

    this.terminalManager.execute({
      sessionId,
      messageId,
      command: pending.command,
      timeoutMs: pending.timeoutMs,
      io: this.io,
      onExit: async ({ exitCode, timedOut, output }) => {
        try {
          const patch = {
            status: exitCode === 0 ? "completed" : timedOut ? "timed_out" : "failed",
            exitCode
          };

          this.sessionManager.updateCommand(sessionId, messageId, patch);

          if (exitCode !== 0) {
            const history = this.sessionManager.getHistory(sessionId);
            const diagnosis = await this.llmService.diagnoseFailure({
              command: pending.command,
              output: timedOut
                ? `${output || ""}\nProcess exceeded the execution timeout.`.trim()
                : output,
              exitCode,
              history
            });

            this.io.to(sessionId).emit("command:diagnosis", {
              messageId,
              diagnosis: diagnosis.diagnosis,
              provider: diagnosis.provider,
              timedOut
            });
          }

          logAudit({
            event: "command.executed",
            sessionId,
            messageId,
            command: pending.command,
            exitCode,
            timedOut
          });
        } catch (error) {
          logError("Execution diagnosis failed", {
            sessionId,
            messageId,
            error: error.message
          });
        }
      }
    });

    this.io.to(sessionId).emit("command:status", {
      messageId,
      status: "running"
    });

    return {
      started: true,
      messageId
    };
  }

  clearSession(sessionId) {
    this.terminalManager.cleanup(sessionId);
    this.sessionManager.clearSession(sessionId);
    return {
      cleared: true
    };
  }
}

module.exports = { CommandProcessor };
