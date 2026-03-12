require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const pty = require("node-pty");

const { generateCommand } = require("./gemini");
const { detectDistro } = require("./distro");
const { searchKnowledge } = require("./rag/search");
const { normalizePrompt } = require("./rag/normalize");
const { simplifyTask } = require("./rag/simplify");
const { validateCommand } = require("./validator");
const { updateKnowledge } = require("./rag/updateKnowledge");
const { planTasks } = require("./planner");
const { generateLocalCommand } = require("./llm/commandGenerator");

const axios = require("axios");

const PORT = 3000;


/*
---------------------------------------
LOCAL LLM COMMAND EXPLANATION
---------------------------------------
*/

async function explainCommand(command) {

  try {

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "mistral",
        prompt: `
You are a Linux expert.

Explain the following command clearly for beginners.

Command:
${command}

Rules:
- Explain what the command does
- Explain important flags/options
- Maximum 5 lines
- No markdown
`,
        stream: false
      }
    );

    const explanation = response?.data?.response;

    if (!explanation) {
      return "Unable to generate explanation.";
    }

    return explanation.trim();

  } catch (error) {

    console.error("Local LLM Explain Error:", error.message);

    return "Unable to generate explanation.";

  }

}


/*
---------------------------------------
HTTP SERVER
---------------------------------------
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
  HEALTH CHECK
  */

  if (req.url === "/health") {

    res.writeHead(200, { "Content-Type": "application/json" });

    res.end(JSON.stringify({
      status: "ok"
    }));

    return;

  }

  /*
  EXPLAIN COMMAND
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
*/

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {

  console.log("Client connected");

  let lastUserPrompt = "";
  let lastNormalizedPrompt = "";
  let lastDistro = "";

  /*
  CREATE TERMINAL
  */

  const shell = pty.spawn("bash", ["-i"], {
    name: "xterm-color",
    cols: 140,
    rows: 45,
    cwd: process.cwd(),
    env: { ...process.env }
  });

  /*
  STREAM TERMINAL OUTPUT
  */

  shell.onData((data) => {

    ws.send(JSON.stringify({
      type: "output",
      data
    }));

  });


  /*
  HANDLE CLIENT MESSAGES
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

          lastUserPrompt = msg.input;
          lastNormalizedPrompt = normalizePrompt(msg.input);
          lastDistro = distro;

          /*
          STEP 1 — PLAN TASKS
          */

          const tasks = await planTasks(msg.input);

          console.log("Planned tasks:", tasks);

          const steps = [];
          const seenTasks = new Set();
          const seenCommands = new Set();

          /*
          STEP 2 — PROCESS TASKS
          */

          for (const task of tasks) {

            try {

              const normalizedTask = normalizePrompt(task);
              const simplifiedTask = simplifyTask(normalizedTask);

              if (seenTasks.has(simplifiedTask)) {
                continue;
              }

              seenTasks.add(simplifiedTask);

              console.log("Processing task:", simplifiedTask);

              /*
              RAG SEARCH
              */

              const ragResult = searchKnowledge(simplifiedTask, distro);

              if (ragResult) {

                const commands = ragResult.commands.filter(cmd => {

                  if (seenCommands.has(cmd)) return false;

                  seenCommands.add(cmd);
                  return true;

                });

                steps.push({
                  task: simplifiedTask,
                  source: "rag",
                  commands,
                  risk: ragResult.risk || "low"
                });

                continue;

              }

              /*
              LOCAL LLM COMMAND GENERATOR
              */

              const localResult = await generateLocalCommand(simplifiedTask, distro);

              if (localResult && localResult.commands) {

                const commands = localResult.commands.filter(cmd => {

                  if (seenCommands.has(cmd)) return false;

                  seenCommands.add(cmd);
                  return true;

                });

                steps.push({
                  task: simplifiedTask,
                  source: "local-llm",
                  commands,
                  risk: localResult.risk || "low"
                });

                continue;

              }

              /*
              GEMINI FALLBACK
              */

              const result = await generateCommand(simplifiedTask, distro);

              const commands = result.commands.filter(cmd => {

                if (seenCommands.has(cmd)) return false;

                seenCommands.add(cmd);
                return true;

              });

              steps.push({
                task: simplifiedTask,
                source: "gemini",
                commands,
                risk: result.risk || "low"
              });

            } catch (taskError) {

              console.log("Task generation failed:", task);

              steps.push({
                task,
                source: "failed",
                commands: [],
                risk: "unknown"
              });

            }

          }

          /*
          SEND RESULTS
          */

          ws.send(JSON.stringify({
            type: "generated",
            distro,
            steps
          }));

        } catch (err) {

          console.error("Generation error:", err);

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

        const validation = validateCommand(msg.command);

        if (!validation.valid) {

          ws.send(JSON.stringify({
            type: "error",
            message: "Command blocked: " + validation.reason
          }));

          return;

        }

        /*
        SELF LEARNING
        */

        if (lastNormalizedPrompt) {

          updateKnowledge(
            lastNormalizedPrompt,
            msg.command,
            lastDistro,
            "low"
          );

          console.log("Knowledge updated:", lastNormalizedPrompt);

        }

        shell.write(msg.command + "\n");

        return;

      }


      /*
      TERMINAL INPUT
      */

      if (msg.type === "input") {

        shell.write(msg.data);
        return;

      }

    } catch (err) {

      console.log("Raw terminal input");

      shell.write(text);

    }

  });


  /*
  CLEANUP
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