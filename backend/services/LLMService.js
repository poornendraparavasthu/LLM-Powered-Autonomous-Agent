const { logError } = require("../config/logger");

function serializeHistory(history) {
  return history
    .slice(-8)
    .map((entry, index) => {
      const resultPart = entry.result
        ? `Result: ${JSON.stringify({
            command: entry.result.command,
            riskLevel: entry.result.riskLevel,
            status: entry.result.status,
            exitCode: entry.result.exitCode ?? null
          })}`
        : "";

      return `History ${index + 1}
User: ${entry.instruction || ""}
${resultPart}`.trim();
    })
    .join("\n\n");
}

class LLMService {
  constructor({
    responseParser,
    providers,
    defaultProvider,
    defaultModel,
    systemProfile
  }) {
    this.responseParser = responseParser;
    this.providers = providers;
    this.defaultProvider = defaultProvider;
    this.defaultModel = defaultModel;
    this.systemProfile = systemProfile;
  }

  providerOrder(requestedProvider) {
    if (requestedProvider === "gemini") {
      return ["gemini", "ollama"];
    }

    if (requestedProvider === "ollama") {
      return ["ollama", "gemini"];
    }

    return this.defaultProvider === "ollama"
      ? ["ollama", "gemini"]
      : ["gemini", "ollama"];
  }

  commandPrompt({ instruction, history }) {
    const profile = this.systemProfile?.getSnapshot?.() || {};
    const packageExamples = profile.packageExamples || {};

    return `
You are an expert Linux command assistant.

Host system:
- Platform: ${profile.platformFamily || "linux"}
- Distribution: ${profile.prettyName || "Unknown"}
- Distribution ID: ${profile.distroId || "unknown"}
- Preferred package manager: ${profile.packageManager || "unknown"}
- System update example: ${packageExamples.updateSystem || "unknown"}
- Package install example: ${packageExamples.installPackage || "unknown"}

Rules:
- Return ONLY valid JSON.
- Generate one primary Bash command.
- Prefer safe, direct commands that work on Linux.
- The command must run directly in Bash. Do not wrap the full command in quotes, code fences, or markdown.
- Do not invent paths or filenames.
- If the task needs administrator privileges, include sudo instead of pretending it can run unprivileged.
- Use sudo especially for package management, service management, and writes under system paths like /etc, /usr, /var, /opt, /boot, or /root.
- Always prefer the host system's native package manager and admin tooling.
- Do not use apt, apt-get, dpkg, yum, dnf, zypper, apk, or pacman unless they match the detected host system or the user explicitly asks for another distro.
- On Arch-based systems, use pacman commands such as "sudo pacman -Syu" and "sudo pacman -S <package>".
- On Debian or Kali, use apt/apt-get. On Fedora/RHEL, use dnf. On openSUSE, use zypper. On Alpine, use apk.
- When writing to a privileged file, use a pattern like "printf ... | sudo tee /path >/dev/null" instead of "sudo echo ... > /path".
- If the task is inside a normal user-owned path, avoid sudo.
- For filesystem-wide search commands, prefer hiding permission noise with 2>/dev/null unless the user explicitly needs privileged access.
- Include a short explanation for beginners.
- Include 0 to 3 alternatives when useful.
- Classify riskLevel as low, medium, or high.
- Avoid multi-step plans unless a single command is impossible.
- Never use markdown, code fences, or commentary outside JSON.

Return this exact JSON shape:
{
  "command": "string",
  "explanation": "string",
  "riskLevel": "low|medium|high",
  "alternatives": ["string"]
}

Conversation history:
${serializeHistory(history) || "None"}

User instruction:
${instruction}
`;
  }

  safetyPrompt({ command, explanation, history }) {
    return `
You are a Linux command safety reviewer.

Review the command in context and return ONLY JSON:
{
  "safe": true,
  "confidence": 0.0,
  "reason": "short explanation"
}

Mark safe=false if the command could destroy data, change system-wide configuration, escalate privileges, or perform risky networking without clear justification.
Legitimate administrative commands may still be appropriate for the user request. If so, explain the risk clearly.

Conversation history:
${serializeHistory(history) || "None"}

Command:
${command}

Explanation:
${explanation}
`;
  }

  diagnosisPrompt({ command, output, exitCode, history }) {
    return `
You are a Linux troubleshooting assistant.

Explain why the command failed and suggest one safe next step.
Return ONLY plain text with at most 5 lines.

Conversation history:
${serializeHistory(history) || "None"}

Command:
${command}

Exit code:
${exitCode}

Terminal output:
${output || "No terminal output captured"}
`;
  }

  explanationPrompt(command) {
    return `
Explain this Linux command for a beginner.

Rules:
- Plain text only
- Maximum 5 lines
- Mention important flags if present

Command:
${command}
`;
  }

  async tryProviders({ prompt, requestedProvider, model, parse }) {
    const order = this.providerOrder(requestedProvider);
    const errors = [];

    for (const providerName of order) {
      const provider = this.providers[providerName];

      if (!provider) {
        continue;
      }

      try {
        const raw = await provider.generateText({
          prompt,
          model: providerName === "ollama" ? model || this.defaultModel : undefined
        });

        return {
          provider: providerName,
          raw,
          parsed: parse ? parse(raw) : raw
        };
      } catch (error) {
        errors.push(`${providerName}: ${error.message}`);
        logError("LLM provider failed", {
          provider: providerName,
          error: error.message
        });
      }
    }

    throw new Error(errors.join(" | ") || "No LLM providers available");
  }

  async generateCommand({ instruction, history, provider, model }) {
    return this.tryProviders({
      prompt: this.commandPrompt({ instruction, history }),
      requestedProvider: provider,
      model,
      parse: raw => this.responseParser.parseCommand(raw)
    });
  }

  async assessSemanticSafety({ command, explanation, history, provider }) {
    return this.tryProviders({
      prompt: this.safetyPrompt({ command, explanation, history }),
      requestedProvider: provider,
      parse: raw => this.responseParser.parseSemanticSafety(raw)
    });
  }

  async explainCommand(command, provider = "ollama") {
    const result = await this.tryProviders({
      prompt: this.explanationPrompt(command),
      requestedProvider: provider
    });

    return {
      provider: result.provider,
      explanation: result.raw.trim()
    };
  }

  async diagnoseFailure({ command, output, exitCode, history, provider = "ollama" }) {
    const result = await this.tryProviders({
      prompt: this.diagnosisPrompt({ command, output, exitCode, history }),
      requestedProvider: provider
    });

    return {
      provider: result.provider,
      diagnosis: result.raw.trim()
    };
  }

  async listModels() {
    const ollama = this.providers.ollama;

    if (!ollama) {
      return [];
    }

    try {
      return await ollama.listModels();
    } catch {
      return [];
    }
  }

  async setupStatus() {
    const ollama = this.providers.ollama;
    const gemini = this.providers.gemini;
    const [ollamaStatus, geminiStatus] = await Promise.all([
      ollama ? ollama.healthcheck() : { available: false, models: [] },
      gemini ? gemini.healthcheck() : { available: false }
    ]);

    return {
      defaultProvider: this.defaultProvider,
      system: this.systemProfile?.getSnapshot?.() || null,
      ollama: ollamaStatus,
      gemini: geminiStatus
    };
  }
}

module.exports = { LLMService };
