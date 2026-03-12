const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}


/*
---------------------------------------
GEMINI API CALL HELPER
---------------------------------------
*/

async function callGemini(prompt) {

  try {

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const text =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    return text.trim();

  } catch (error) {

    console.error(
      "Gemini API Error:",
      error.response?.data || error.message
    );

    throw new Error("Gemini API call failed");

  }

}


/*
---------------------------------------
GENERATE LINUX COMMANDS (FALLBACK)
---------------------------------------
*/

async function generateCommand(userInput, distro) {

  try {

    const prompt = `
You are a Linux troubleshooting assistant.

Target distribution: ${distro}

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- No explanations
- No code blocks
- Do NOT include cd commands
- Commands must work on ${distro}
- Do not use nano (use echo with redirection)

Return format:
{
  "commands": ["command1", "command2"],
  "risk": "low | medium | high"
}

User request:
${userInput}
`;

    const rawText = await callGemini(prompt);

    let parsed;

    try {

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("No JSON returned from Gemini");
      }

      parsed = JSON.parse(jsonMatch[0]);

    } catch {

      throw new Error("Gemini returned invalid JSON");

    }

    if (!Array.isArray(parsed.commands)) {
      throw new Error("Invalid commands format");
    }

    if (!["low", "medium", "high"].includes(parsed.risk)) {
      parsed.risk = "unknown";
    }

    return parsed;

  } catch (error) {

    console.error(
      "Gemini Command Error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to generate command from Gemini");

  }

}


/*
---------------------------------------
EXPORTS
---------------------------------------
*/

module.exports = {
  generateCommand
};