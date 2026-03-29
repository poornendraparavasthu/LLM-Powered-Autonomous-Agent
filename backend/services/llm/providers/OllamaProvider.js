const axios = require("axios");

class OllamaProvider {
  constructor({ baseUrl, defaultModel, timeoutMs }) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.timeoutMs = timeoutMs;
    this.name = "ollama";
  }

  async generateText({ prompt, model }) {
    const response = await axios.post(
      `${this.baseUrl}/api/generate`,
      {
        model: model || this.defaultModel,
        prompt,
        stream: false
      },
      {
        timeout: this.timeoutMs
      }
    );

    const text = response?.data?.response;

    if (!text) {
      throw new Error("Ollama returned an empty response");
    }

    return text.trim();
  }

  async listModels() {
    const response = await axios.get(`${this.baseUrl}/api/tags`, {
      timeout: this.timeoutMs
    });

    return (response?.data?.models || []).map(model => ({
      name: model.name,
      size: model.size
    }));
  }

  async healthcheck() {
    try {
      const models = await this.listModels();
      return {
        available: true,
        models
      };
    } catch (error) {
      return {
        available: false,
        models: [],
        error: error.message
      };
    }
  }
}

module.exports = { OllamaProvider };
