const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

/**
 * Generates Linux commands using Gemini
 * @param {string} userInput - User error or request
 * @param {string} distro - Target Linux distribution
 * @returns {Promise<Object>} { commands: [], risk: string }
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
- No code blocks.
- Commands must be compatible with ${distro}.
- No chained commands (no &&, ||, ;, |).

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

    const rawText = response.data.candidates[0].content.parts[0].text.trim();

    // Try parsing Gemini output as JSON
    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      throw new Error("Gemini did not return valid JSON");
    }

    // Basic validation
    if (!Array.isArray(parsed.commands)) {
      throw new Error("Invalid commands format from Gemini");
    }

    if (!["low", "medium", "high"].includes(parsed.risk)) {
      parsed.risk = "unknown";
    }

    return parsed;

  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    throw new Error("Failed to generate command from Gemini");
  }
}

module.exports = { generateCommand };