const express = require("express");

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function createApiRouter({ commandProcessor, llmService, sessionManager }) {
  const router = express.Router();

  router.get("/health", async (_req, res) => {
    const setup = await llmService.setupStatus();
    res.json({
      status: "ok",
      defaultProvider: setup.defaultProvider
    });
  });

  router.get("/models", async (_req, res) => {
    const models = await llmService.listModels();
    res.json({ models });
  });

  router.get("/setup", async (_req, res) => {
    const setup = await llmService.setupStatus();
    res.json(setup);
  });

  router.get("/session/history", (req, res) => {
    const sessionId = req.query.sessionId;

    if (!isUuidLike(sessionId)) {
      return res.status(400).json({
        error: "A valid sessionId is required."
      });
    }

    return res.json({
      history: sessionManager.getCommandHistory(sessionId)
    });
  });

  router.post("/session/clear", (req, res) => {
    const { sessionId } = req.body || {};

    if (!isUuidLike(sessionId)) {
      return res.status(400).json({
        error: "A valid sessionId is required."
      });
    }

    return res.json(commandProcessor.clearSession(sessionId));
  });

  const ALLOWED_PROVIDERS = new Set(["ollama", "gemini"]);

  router.post("/command", async (req, res) => {
    const { instruction, sessionId, provider, model } = req.body || {};

    if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
      return res.status(400).json({
        error: "instruction is required."
      });
    }

    if (instruction.length > 2000) {
      return res.status(400).json({
        error: "instruction must be 2000 characters or fewer."
      });
    }

    if (!isUuidLike(sessionId)) {
      return res.status(400).json({
        error: "A valid sessionId is required."
      });
    }

    if (provider !== undefined && !ALLOWED_PROVIDERS.has(provider)) {
      return res.status(400).json({ error: "Invalid provider." });
    }

    if (model !== undefined && (typeof model !== "string" || model.length > 128)) {
      return res.status(400).json({ error: "Invalid model." });
    }

    try {
      const result = await commandProcessor.process({
        instruction: instruction.trim(),
        sessionId,
        provider: ALLOWED_PROVIDERS.has(provider) ? provider : undefined,
        model: typeof model === "string" ? model.slice(0, 128) : undefined
      });

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error: "Command generation failed. Check that Ollama is running."
      });
    }
  });

  router.post("/command/execute", async (req, res) => {
    const { sessionId, messageId, confirmed = false } = req.body || {};

    if (!isUuidLike(sessionId) || !isUuidLike(messageId)) {
      return res.status(400).json({
        error: "sessionId and messageId are required."
      });
    }

    try {
      const result = await commandProcessor.execute({
        sessionId,
        messageId,
        confirmed
      });

      return res.json(result);
    } catch (error) {
      const msg = error.message || "";
      if (msg.includes("not found")) {
        return res.status(404).json({ error: "Command not found for this session." });
      }
      if (msg.includes("Blocked") || msg.includes("Confirmation")) {
        return res.status(400).json({ error: msg });
      }
      return res.status(400).json({ error: "Execution request failed." });
    }
  });

  router.post("/explain", async (req, res) => {
    const { command, provider } = req.body || {};

    if (!command || typeof command !== "string" || command.trim().length === 0) {
      return res.status(400).json({
        error: "command is required."
      });
    }

    if (command.length > 2000) {
      return res.status(400).json({ error: "command is too long." });
    }

    try {
      const explanation = await llmService.explainCommand(command, "ollama");
      return res.json(explanation);
    } catch (error) {
      return res.status(500).json({
        error: "Explanation failed. Check that Ollama is running."
      });
    }
  });

  return router;
}

module.exports = { createApiRouter };
