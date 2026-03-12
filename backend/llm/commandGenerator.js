const axios = require("axios");

/*
---------------------------------------
LOCAL LLM COMMAND GENERATOR
Uses Ollama (Mistral) to convert tasks
into Linux commands
---------------------------------------
*/

async function generateLocalCommand(task, distro) {

  try {

    const prompt = `
You are a Linux command generator.

Convert the following task into ONE safe Linux command.

Rules:
- Return ONLY JSON
- No explanations
- No markdown
- Use the correct package manager for the distro
- Command must be safe

Format:
{
 "commands": ["command"],
 "risk": "low"
}

Distro: ${distro}

Task:
${task}
`;

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "mistral",
        prompt: prompt,
        stream: false
      }
    );

    const text = response.data.response.trim();

    const parsed = JSON.parse(text);

    if (parsed.commands) {
      return parsed;
    }

    throw new Error("Invalid LLM output");

  } catch (err) {

    console.log("Local LLM failed");

    return null;

  }

}

module.exports = { generateLocalCommand };