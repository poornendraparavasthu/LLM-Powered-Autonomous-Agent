const axios = require("axios");

class GeminiProvider {
  constructor({ apiKey, model, timeoutMs }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.name = "gemini";
  }

  async generateText({ prompt }) {
    if (!this.apiKey) {
      throw new Error("Gemini API key is not configured");
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        timeout: this.timeoutMs
      }
    );

    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    return text.trim();
  }

  async healthcheck() {
    return {
      available: Boolean(this.apiKey),
      error: this.apiKey ? null : "Gemini API key is not configured"
    };
  }
}

module.exports = { GeminiProvider };
