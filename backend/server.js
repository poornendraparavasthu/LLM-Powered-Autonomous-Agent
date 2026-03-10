require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const pty = require("node-pty");

const { generateCommand, explainCommand } = require("./gemini");
const { detectDistro } = require("./distro");

const PORT = 3000;

/*
---------------------------------------
HTTP SERVER
---------------------------------------
Handles normal HTTP endpoints
*/
const server = http.createServer(async (req, res) => {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  /*
  ---------------------------------------
  HEALTH CHECK
  ---------------------------------------
  */

  if (req.url === "/health") {

    res.writeHead(200, { "Content-Type": "application/json" });

    res.end(JSON.stringify({
      status: "ok"
    }));

    return;
  }

  /*
  ---------------------------------------
  EXPLAIN COMMAND
  ---------------------------------------
  */

  if (req.method === "POST" && req.url === "/explain") {

    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {

      try {

        const { command } = JSON.parse(body);

        const explanation = await explainCommand(command);

        res.writeHead(200, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          explanation
        }));

      } catch (err) {

        console.error("Explain error:", err);

        res.writeHead(500, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          explanation: "Failed to generate explanation."
        }));

      }

    });

    return;
  }

  res.writeHead(404);
  res.end();

});


/*
---------------------------------------
WEBSOCKET SERVER
---------------------------------------
Handles terminal + command generation
*/

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {

  console.log("Client connected");

  /*
  ---------------------------------------
  CREATE PERSISTENT TERMINAL
  ---------------------------------------
  */

  const shell = pty.spawn("bash", ["-i"], {
    name: "xterm-color",
    cols: 140,
    rows: 45,
    cwd: process.cwd(),
    env: {
      ...process.env
    }
  });

  /*
  ---------------------------------------
  STREAM TERMINAL OUTPUT
  ---------------------------------------
  */

  shell.onData((data) => {

    ws.send(JSON.stringify({
      type: "output",
      data
    }));

  });

  /*
  ---------------------------------------
  HANDLE CLIENT MESSAGES
  ---------------------------------------
  */

  ws.on("message", async (message) => {

    const text = message.toString();

    try {

      const msg = JSON.parse(text);

      /*
      ---------------------------------------
      GENERATE COMMANDS
      ---------------------------------------
      */

      if (msg.type === "generate") {

        try {

          const distro = detectDistro();

          const result = await generateCommand(msg.input, distro);

          ws.send(JSON.stringify({
            type: "generated",
            distro,
            ...result
          }));

        } catch (err) {

          ws.send(JSON.stringify({
            type: "error",
            message: "Command generation failed"
          }));

        }

        return;
      }

      /*
      ---------------------------------------
      RUN COMMAND
      ---------------------------------------
      */

      if (msg.type === "run") {

        shell.write(msg.command + "\n");

        return;
      }

      /*
      ---------------------------------------
      TERMINAL INPUT
      ---------------------------------------
      */

      if (msg.type === "input") {

        shell.write(msg.data);

        return;
      }

    } catch {

      shell.write(text);

    }

  });

  /*
  ---------------------------------------
  CLEANUP
  ---------------------------------------
  */

  ws.on("close", () => {

    console.log("Client disconnected");

    shell.kill();

  });

});


/*
---------------------------------------
START SERVER
---------------------------------------
*/

server.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});