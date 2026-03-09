require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const pty = require("node-pty");

const { generateCommand } = require("./gemini");
const { detectDistro } = require("./distro");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  const shell = pty.spawn("bash", ["--noprofile", "--norc", "-i"],{
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: {
    ...process.env,
    PS1: "__PROMPT__ "
  }
});

  let isCommandRunning = false;

  shell.onData((data) => {
  ws.send(JSON.stringify({
    type: "output",
    data
  }));

  if (isCommandRunning && data.includes("__PROMPT__")) {
    isCommandRunning = false;
    ws.send(JSON.stringify({ type: "done" }));
  }
});

  ws.on("message", async (message) => {
    const text = message.toString();

    try {
      const msg = JSON.parse(text);

      if (msg.type === "generate") {
        try {
          const distro = detectDistro();
          const result = await generateCommand(msg.input, distro);

          ws.send(JSON.stringify({
            type: "generated",
            distro,
            ...result
          }));
        } catch {
          ws.send(JSON.stringify({
            type: "error",
            message: "Generation failed"
          }));
        }
        return;
      }

    if (msg.type === "run") {
  if (isCommandRunning) {
    ws.send(JSON.stringify({
      type: "error",
      message: "Another command is already running."
    }));
    return;
  }

  isCommandRunning = true;
  shell.write(msg.command + "\n");
  return;
}

      if (msg.type === "input") {
        if (isCommandRunning) {
          shell.write(msg.data);
        }
        return;
      }

    } catch {
      if (isCommandRunning) {
        shell.write(text);
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    shell.kill();
  });
});

server.listen(3000, () => {
  console.log("WebSocket server running on port 3000");
});