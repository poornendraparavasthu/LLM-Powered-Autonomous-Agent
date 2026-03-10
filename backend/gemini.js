const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

/*
---------------------------------------
GENERATE LINUX COMMANDS
---------------------------------------
*/

async function generateCommand(userInput, distro) {

  try {

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `
You are a Linux troubleshooting assistant.

Target distribution: ${distro}

STRICT RULES:
- Return ONLY valid JSON.
- No markdown.
- No explanations.
- Do not give cd commands.
- No code blocks.
- Commands must be compatible with ${distro}.
- Do not give complex chained commands.

Return format:
{
  "commands": ["command1", "command2"],
  "risk": "low | medium | high"
}

User request or error:
${userInput}
`
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const rawText =
      response.data.candidates[0].content.parts[0].text.trim();

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("Gemini did not return valid JSON");
    }

    if (!Array.isArray(parsed.commands)) {
      throw new Error("Invalid commands format from Gemini");
    }

    if (!["low", "medium", "high"].includes(parsed.risk)) {
      parsed.risk = "unknown";
    }

    return parsed;

  } catch (error) {

    console.error(
      "Gemini API Error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to generate command from Gemini");
  }
}


/*
---------------------------------------
EXPLAIN LINUX COMMAND
---------------------------------------
*/

async function explainCommand(command) {

  try {

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `
Explain this Linux command clearly and simply.

Command:
${command}

Rules:
- Explain what the command does
- Explain important flags
- Keep explanation short
- 3–5 lines maximum
- No markdown
`
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const explanation =
      response.data.candidates[0].content.parts[0].text.trim();

    return explanation;

  } catch (error) {

    console.error(
      "Gemini Explain Error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to generate explanation");
  }

}

module.exports = {
  generateCommand,
  explainCommand
};