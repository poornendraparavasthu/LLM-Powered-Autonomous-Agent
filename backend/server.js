require("dotenv").config();

const http = require("http");
const net = require("net");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const { env } = require("./config/env");
const { logAudit, logInfo, logError } = require("./config/logger");
const { ResponseParser } = require("./services/ResponseParser");
const { OllamaProvider } = require("./services/llm/providers/OllamaProvider");
const { GeminiProvider } = require("./services/llm/providers/GeminiProvider");
const { LLMService } = require("./services/LLMService");
const { SessionManager } = require("./services/SessionManager");
const { CommandValidator } = require("./services/CommandValidator");
const { TerminalManager } = require("./services/TerminalManager");
const { CommandProcessor } = require("./services/CommandProcessor");
const { SystemProfile } = require("./services/SystemProfile");
const { createApiRouter } = require("./routes/createApiRouter");

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off("listening", handleListening);
      server.off("error", handleError);
    };

    const handleListening = () => {
      cleanup();
      resolve();
    };

    const handleError = error => {
      cleanup();
      reject(error);
    };

    server.once("listening", handleListening);
    server.once("error", handleError);
    server.listen(port, host);
  });
}

function probePort(port, host) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();

    probe.once("error", reject);
    probe.listen(port, host, () => {
      probe.close(error => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });
}

async function findAvailablePort(startPort, host, attempts = 6) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;

    try {
      await probePort(candidate, host);
      return candidate;
    } catch {
      // Try the next port.
    }
  }

  throw new Error(
    `Could not find an available port starting from ${startPort} on ${host}.`
  );
}

async function isExistingBackend(host, port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`http://${host}:${port}/health`, {
      signal: controller.signal
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => null);
    return payload?.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function shutdownRuntime(runtime) {
  try {
    runtime.io?.close();
  } catch {
    // ignore
  }

  try {
    runtime.server?.close();
  } catch {
    // ignore
  }
}

function createRuntime(overrides = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.allowedOrigins,
      credentials: true
    }
  });
  const systemProfile = overrides.systemProfile || new SystemProfile();

  const responseParser = overrides.responseParser || new ResponseParser();
  const providers =
    overrides.providers ||
    {
      ollama: new OllamaProvider({
        baseUrl: env.ollamaUrl,
        defaultModel: env.ollamaModel,
        timeoutMs: env.ollamaTimeoutMs
      }),
      gemini: new GeminiProvider({
        apiKey: env.geminiApiKey,
        model: env.geminiModel,
        timeoutMs: env.geminiTimeoutMs
      })
    };

  const llmService =
    overrides.llmService ||
    new LLMService({
      responseParser,
      providers,
      defaultProvider: env.defaultProvider,
      defaultModel: env.ollamaModel,
      systemProfile
    });

  const sessionManager =
    overrides.sessionManager ||
    new SessionManager({
      ttlMs: env.sessionTtlMs
    });

  const validator =
    overrides.validator ||
    new CommandValidator({
      llmService
    });

  const terminalManager =
    overrides.terminalManager ||
    new TerminalManager({
      executionTimeoutMs: env.executionTimeoutMs,
      agentHome: env.agentHome,
      agentUser: env.agentUser,
      shellPath: env.shellPath
    });

  const commandProcessor =
    overrides.commandProcessor ||
    new CommandProcessor({
      sessionManager,
      llmService,
      validator,
      terminalManager,
      io,
      systemProfile
    });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", ...env.allowedOrigins],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      frameguard: { action: "deny" }
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (origin && env.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS"));
      },
      credentials: true
    })
  );
  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: "Too many requests, please try again later."
    })
  );
  app.use(express.json({ limit: "32kb" }));
  app.use((req, _res, next) => {
    logAudit({
      event: "http.request",
      method: req.method,
      path: req.path,
      origin: req.headers.origin || "unknown"
    });
    next();
  });

  app.use(
    "/api",
    createApiRouter({
      commandProcessor,
      llmService,
      sessionManager
    })
  );

  app.get("/health", async (_req, res) => {
    const setup = await llmService.setupStatus();
    res.json({
      status: "ok",
      defaultProvider: setup.defaultProvider,
      host: env.host,
      port: server.address()?.port || env.port
    });
  });

  app.use((error, _req, res, _next) => {
    logError("Unhandled app error", {
      error: error.message
    });

    res.status(500).json({
      error: error.message || "Unexpected server error."
    });
  });

  io.use((socket, next) => {
    const sessionId =
      socket.handshake.auth?.sessionId || socket.handshake.query?.sessionId;

    if (!sessionId) {
      next(new Error("sessionId is required"));
      return;
    }

    sessionManager.ensureSession(String(sessionId));
    socket.data.sessionId = String(sessionId);
    
    // Rate limit per socket: max 100 events per 10 seconds
    socket.data.eventCount = 0;
    socket.data.eventWindowStart = Date.now();
    
    next();
  });

  io.on("connection", socket => {
    const sessionId = socket.data.sessionId;
    socket.join(sessionId);
    terminalManager.attachSession({
      sessionId,
      io
    });

    socket.emit("connection:ready", {
      sessionId,
      defaultProvider: env.defaultProvider
    });

    // Rate limit middleware for socket events
    const checkRateLimit = (eventName) => {
      const now = Date.now();
      const windowStart = socket.data.eventWindowStart || now;
      
      // Reset window if 10 seconds have passed
      if (now - windowStart > 10000) {
        socket.data.eventCount = 0;
        socket.data.eventWindowStart = now;
      }
      
      socket.data.eventCount += 1;
      
      if (socket.data.eventCount > 100) {
        logAudit({
          event: "socket.rate_limit_exceeded",
          sessionId,
          eventName,
          eventCount: socket.data.eventCount
        });
        return false;
      }
      
      return true;
    };

    socket.on("terminal:input", payload => {
      if (!checkRateLimit("terminal:input")) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }
      
      if (!payload?.data) {
        return;
      }

      terminalManager.writeInput(sessionId, payload.data);
    });

    socket.on("terminal:resize", payload => {
      const cols = Number(payload?.cols);
      const rows = Number(payload?.rows);
      if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 1 || rows < 1) return;
      terminalManager.resize(sessionId, cols, rows);
    });

    socket.on("command:cancel", () => {
      if (!checkRateLimit("command:cancel")) {
        socket.emit("error", { message: "Rate limit exceeded" });
        return;
      }
      
      terminalManager.cancel(sessionId);
      io.to(sessionId).emit("command:status", {
        status: "cancelled"
      });
    });

    socket.on("disconnect", () => {
      terminalManager.cleanup(sessionId);
    });
  });

  return {
    app,
    server,
    io,
    llmService,
    sessionManager,
    commandProcessor,
    validator,
    terminalManager,
    systemProfile
  };
}

async function start() {
  const runtime = createRuntime();
  let portToUse = env.port;

  try {
    await listen(runtime.server, portToUse, env.host);
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      if (await isExistingBackend(env.host, env.port)) {
        const message = `Linux AI Assistant backend is already running on ${env.host}:${env.port}. Reusing the existing server.`;
        logInfo(message, {
          host: env.host,
          port: env.port
        });
        console.log(message);
        shutdownRuntime(runtime);
        return runtime;
      }

      portToUse = await findAvailablePort(env.port + 1, env.host);
      await listen(runtime.server, portToUse, env.host);
      const fallbackMessage = `Port ${env.port} was busy, so the backend started on ${env.host}:${portToUse}.`;
      logInfo(fallbackMessage, {
        host: env.host,
        requestedPort: env.port,
        port: portToUse
      });
      console.log(fallbackMessage);
    } else if (error.code === "EACCES") {
      const message = `Permission denied while binding to ${env.host}:${env.port}. Try a non-privileged port such as 3000 or 3001.`;
      logError("Server failed to start", {
        host: env.host,
        port: env.port,
        error: message
      });
      throw new Error(message);
    } else {
      logError("Server failed to start", {
        host: env.host,
        port: env.port,
        error: error.message
      });
      throw error;
    }
  }

  logInfo("Server started", {
    host: env.host,
    port: portToUse,
    defaultProvider: env.defaultProvider
  });
  console.log(`Server running on ${env.host}:${portToUse}`);

  return runtime;
}

if (require.main === module) {
  start().catch(error => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  createRuntime,
  start
};
