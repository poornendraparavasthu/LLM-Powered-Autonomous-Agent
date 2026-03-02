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

  // Create one shell per client
  const shell = pty.spawn("bash", [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });

  // Stream shell output to client
  shell.onData((data) => {
    ws.send(JSON.stringify({
      type: "output",
      data
    }));
  });

 ws.on("message", async (message) => {
  const text = message.toString();

  try {
    const msg = JSON.parse(text);

    // AI GENERATION
    if (msg.type === "generate") {
      const distro = detectDistro();
      const result = await generateCommand(msg.input, distro);

      ws.send(JSON.stringify({
        type: "generated",
        distro,
        ...result
      }));
      return;
    }

    // RUN COMMAND (single-shot)
    if (msg.type === "run") {
      shell.write(msg.command + "\n");
      return;
    }

  } catch {
    // Not JSON → treat as interactive shell input
    shell.write(text);
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