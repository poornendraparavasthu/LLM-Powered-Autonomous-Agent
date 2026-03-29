const fs = require("fs");
const { spawnSync } = require("child_process");
const pty = require("node-pty");

function resolveIdentity(agentUser) {
  try {
    const uid = spawnSync("id", ["-u", agentUser], {
      encoding: "utf8"
    });
    const gid = spawnSync("id", ["-g", agentUser], {
      encoding: "utf8"
    });

    if (uid.status !== 0 || gid.status !== 0) {
      return null;
    }

    return {
      uid: Number.parseInt(uid.stdout.trim(), 10),
      gid: Number.parseInt(gid.stdout.trim(), 10)
    };
  } catch {
    return null;
  }
}

class TerminalManager {
  constructor({ executionTimeoutMs, agentHome, agentUser, shellPath = "/bin/bash" }) {
    this.executionTimeoutMs = executionTimeoutMs;
    this.agentHome = agentHome;
    this.agentUser = agentUser;
    this.shellPath = shellPath;
    this.sessionStates = new Map();
  }

  ensureWorkspace(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  getSessionState(sessionId) {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, {
        shell: null,
        execution: null
      });
    }

    return this.sessionStates.get(sessionId);
  }

  resolveRuntimeProfile() {
    const configuredIdentity = resolveIdentity(this.agentUser);
    const runningAsRoot =
      typeof process.getuid === "function" && process.getuid() === 0;

    if (configuredIdentity && runningAsRoot) {
      return {
        home: this.agentHome,
        user: this.agentUser,
        cwd: this.agentHome,
        uid: configuredIdentity.uid,
        gid: configuredIdentity.gid
      };
    }

    const userHome = process.env.HOME || this.agentHome;
    const userName = process.env.USER || this.agentUser;

    return {
      home: userHome,
      user: userName,
      cwd: userHome
    };
  }

  buildPtyOptions() {
    const profile = this.resolveRuntimeProfile();
    this.ensureWorkspace(profile.cwd);

    const options = {
      name: "xterm-256color",
      cols: 220,
      rows: 52,
      cwd: profile.cwd,
      env: {
        TERM: "xterm-256color",
        HOME: profile.home,
        USER: profile.user,
        LOGNAME: profile.user,
        SHELL: this.shellPath,
        PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        LANG: process.env.LANG || "en_US.UTF-8",
        LC_ALL: process.env.LC_ALL || "",
        LC_CTYPE: process.env.LC_CTYPE || "",
        DISPLAY: process.env.DISPLAY || "",
        WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || "",
        DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS || "",
        XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || "",
        XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || "",
        COLORTERM: process.env.COLORTERM || "truecolor"
      }
    };

    if (typeof profile.uid === "number" && typeof profile.gid === "number") {
      options.uid = profile.uid;
      options.gid = profile.gid;
    }

    return options;
  }

  emitBuffered(io, room, event, payloadBuilder) {
    let buffer = "";
    let timer = null;
    const maxBufferSize = 2048; // Smaller buffer to flush more frequently

    const flush = () => {
      if (!buffer) {
        return;
      }

      io.to(room).emit(event, payloadBuilder(buffer));
      buffer = "";
      timer = null;
    };

    return {
      push(chunk) {
        buffer += chunk;

        // Flush immediately if buffer is getting large
        if (buffer.length > maxBufferSize) {
          flush();
          return;
        }

        if (!timer) {
          // Shorter flush interval for more responsive output
          timer = setTimeout(flush, 50);
        }
      },
      flush() {
        if (timer) {
          clearTimeout(timer);
        }

        flush();
      }
    };
  }

  attachSession({ sessionId, io }) {
    const state = this.getSessionState(sessionId);

    if (state.shell?.term) {
      return;
    }

    const shell = pty.spawn(this.shellPath, ["-i"], this.buildPtyOptions());
    const output = this.emitBuffered(io, sessionId, "terminal:output", data => ({
      data,
      source: "shell"
    }));

    shell.onData(chunk => {
      output.push(chunk);
    });

    shell.onExit(() => {
      output.flush();
      const nextState = this.getSessionState(sessionId);
      nextState.shell = null;
      io.to(sessionId).emit("terminal:ready", {
        status: "closed"
      });
    });

    state.shell = {
      term: shell
    };

    io.to(sessionId).emit("terminal:ready", {
      status: "ready"
    });
  }

  cancelExecution(sessionId) {
    const state = this.getSessionState(sessionId);

    if (!state.execution?.term) {
      return false;
    }

    try {
      state.execution.term.kill();
    } catch {
      // ignore
    }

    state.execution = null;
    return true;
  }

  execute({ sessionId, messageId, command, io, onExit, timeoutMs }) {
    const state = this.getSessionState(sessionId);
    this.cancelExecution(sessionId);

    const term = pty.spawn(this.shellPath, ["-lc", command], this.buildPtyOptions());
    const output = this.emitBuffered(io, sessionId, "terminal:output", data => ({
      messageId,
      data,
      source: "command"
    }));

    let combinedOutput = "";
    let timedOut = false;

    const appendOutput = chunk => {
      combinedOutput = `${combinedOutput}${chunk}`;

      // Keep only last 8KB to prevent memory bloat on very long outputs
      if (combinedOutput.length > 8_000) {
        combinedOutput = combinedOutput.slice(-8_000);
      }
    };

    const timeout = setTimeout(() => {
      timedOut = true;

      try {
        term.kill("SIGTERM");
      } catch {
        // ignore
      }

      setTimeout(() => {
        try {
          term.kill("SIGKILL");
        } catch {
          // ignore
        }
      }, 2_000);
    }, timeoutMs || this.executionTimeoutMs);

    term.onData(chunk => {
      appendOutput(chunk);
      output.push(chunk);

      if (/password/i.test(chunk) && /\bsudo\b/.test(command)) {
        io.to(sessionId).emit("command:status", {
          messageId,
          status: "awaiting_input"
        });
      }
    });

    term.onExit(({ exitCode, signal }) => {
      clearTimeout(timeout);
      output.flush();

      const nextState = this.getSessionState(sessionId);
      nextState.execution = null;

      io.to(sessionId).emit("terminal:exit", {
        messageId,
        exitCode,
        signal,
        timedOut,
        output: combinedOutput
      });

      onExit?.({
        exitCode,
        signal,
        timedOut,
        output: combinedOutput
      });
    });

    state.execution = {
      messageId,
      term
    };
  }

  writeInput(sessionId, data) {
    const state = this.getSessionState(sessionId);
    const maxChunkSize = 4096;
    const chunk = String(data || "").slice(0, maxChunkSize);

    try {
      if (state.execution?.term) {
        if (chunk.length > 0) {
          state.execution.term.write(chunk);
        }
        return "execution";
      }

      if (state.shell?.term) {
        if (chunk.length > 0) {
          state.shell.term.write(chunk);
        }
        return "shell";
      }
    } catch (error) {
      console.error(`Failed to write terminal input: ${error}`);
    }

    return false;
  }

  cancel(sessionId) {
    if (this.cancelExecution(sessionId)) {
      return true;
    }

    const state = this.getSessionState(sessionId);

    if (!state.shell?.term) {
      return false;
    }

    try {
      state.shell.term.write("\u0003");
      return true;
    } catch {
      return false;
    }
  }

  cleanup(sessionId) {
    const state = this.sessionStates.get(sessionId);

    if (!state) {
      return false;
    }

    for (const entry of [state.execution, state.shell]) {
      if (!entry?.term) {
        continue;
      }

      try {
        entry.term.kill();
      } catch {
        // ignore
      }
    }

    this.sessionStates.delete(sessionId);
    return true;
  }
}

module.exports = { TerminalManager };
