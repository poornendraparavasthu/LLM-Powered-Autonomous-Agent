const { z } = require("zod");
const { sanitizeGeneratedResult } = require("./commandHeuristics");

const commandResultSchema = z.object({
  command: z.string().min(1),
  explanation: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]).default("low"),
  alternatives: z.array(z.string().min(1)).max(4).default([]),
  confidence: z.number().min(0).max(1).optional()
});

const semanticSafetySchema = z.object({
  safe: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1)
});

function extractJson(rawText) {
  const match = String(rawText || "").match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function fallbackCommand(rawText) {
  const lines = String(rawText || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const codeLine =
    lines.find(line => /^[\w./-]+(\s+.+)?$/.test(line) && !line.includes(":")) ||
    "";

  return {
    ...sanitizeGeneratedResult({
      command: codeLine,
      explanation: "Generated using fallback parsing.",
      riskLevel: "low",
      alternatives: []
    }),
    explanation: "Generated using fallback parsing.",
    _fallback: true
  };
}

class ResponseParser {
  parseCommand(rawText) {
    const json = extractJson(rawText);

    if (!json) {
      return fallbackCommand(rawText);
    }

    try {
      const parsed = commandResultSchema.parse(JSON.parse(json));
      return sanitizeGeneratedResult(parsed);
    } catch {
      return fallbackCommand(rawText);
    }
  }

  parseSemanticSafety(rawText) {
    const json = extractJson(rawText);

    if (!json) {
      throw new Error("Semantic safety JSON not found");
    }

    try {
      return semanticSafetySchema.parse(JSON.parse(json));
    } catch {
      throw new Error("Semantic safety response was malformed");
    }
  }
}

module.exports = { ResponseParser };
