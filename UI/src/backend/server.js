require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { generateCommand } = require("./gemini");
const { detectDistro } = require("./distro");
const { runCommand } = require("./executor");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/generate", async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ error: "Input required" });
  }

  const distro = detectDistro();  // Automatically detect

  try {
    const result = await generateCommand(input, distro);
    res.json({
      distro,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/run", async (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Command required" });
  }

  const result = await runCommand(command);

  res.json(result);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});