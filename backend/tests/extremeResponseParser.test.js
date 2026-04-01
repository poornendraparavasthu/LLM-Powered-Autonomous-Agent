const test = require("node:test");
const assert = require("node:assert/strict");

const { ResponseParser } = require("../services/ResponseParser");

const parser = new ResponseParser();

/* ═══════════════════════════════════════════════════════════════════
   1. VALID JSON PARSING — various formats
   ═══════════════════════════════════════════════════════════════════ */

test("parses clean JSON response", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "ls -la",
    explanation: "Lists files",
    riskLevel: "low",
    alternatives: ["ls"]
  }));
  assert.equal(result.command, "ls -la");
  assert.equal(result.riskLevel, "low");
});

test("parses JSON embedded in markdown text", () => {
  const result = parser.parseCommand(`
Here is the command:
\`\`\`json
{
  "command": "df -h",
  "explanation": "Shows disk usage",
  "riskLevel": "low",
  "alternatives": []
}
\`\`\`
  `);
  assert.equal(result.command, "df -h");
});

test("parses JSON with extra text before and after", () => {
  const result = parser.parseCommand(`
I'll help you with that. Here's the command:

{"command": "whoami", "explanation": "Shows current user", "riskLevel": "low", "alternatives": []}

This command will show your username.
  `);
  assert.equal(result.command, "whoami");
});

test("parses JSON with all 4 alternatives (max)", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "top",
    explanation: "Process viewer",
    riskLevel: "low",
    alternatives: ["htop", "btop", "atop", "glances"]
  }));
  assert.equal(result.alternatives.length, 4);
});

/* ═══════════════════════════════════════════════════════════════════
   2. FALLBACK PARSING — when JSON is missing/broken
   ═══════════════════════════════════════════════════════════════════ */

test("fallback: extracts command from plain text", () => {
  const result = parser.parseCommand("ls -la");
  assert.equal(result.command, "ls -la");
  assert.equal(result._fallback, true);
});

test("fallback: extracts first code-like line", () => {
  const result = parser.parseCommand(`
You should run this:
df -h
This shows disk usage.
  `);
  assert.equal(result._fallback, true);
  assert.ok(result.command, "Should extract something");
});

test("fallback: handles completely empty input", () => {
  const result = parser.parseCommand("");
  assert.equal(result._fallback, true);
  assert.equal(result.command, "");
});

test("fallback: handles null input", () => {
  const result = parser.parseCommand(null);
  assert.equal(result._fallback, true);
});

test("fallback: handles undefined input", () => {
  const result = parser.parseCommand(undefined);
  assert.equal(result._fallback, true);
});

/* ═══════════════════════════════════════════════════════════════════
   3. MALFORMED JSON — various corruption types
   ═══════════════════════════════════════════════════════════════════ */

test("malformed: truncated JSON falls back", () => {
  const result = parser.parseCommand('{"command": "ls -la", "explanation": "list');
  assert.equal(result._fallback, true);
});

test("malformed: JSON with trailing comma falls back", () => {
  const result = parser.parseCommand('{"command": "ls", "explanation": "list",}');
  assert.equal(result._fallback, true);
});

test("malformed: missing required field (command) falls back", () => {
  const result = parser.parseCommand(JSON.stringify({
    explanation: "Lists files",
    riskLevel: "low",
    alternatives: []
  }));
  assert.equal(result._fallback, true);
});

test("malformed: empty command string fails Zod validation", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "",
    explanation: "nothing",
    riskLevel: "low",
    alternatives: []
  }));
  assert.equal(result._fallback, true);
});

test("malformed: invalid riskLevel uses default", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "ls",
    explanation: "list",
    riskLevel: "critical",
    alternatives: []
  }));
  // Invalid enum should cause fallback
  assert.equal(result._fallback, true);
});

/* ═══════════════════════════════════════════════════════════════════
   4. SANITIZATION THROUGH PARSER
   ═══════════════════════════════════════════════════════════════════ */

test("strips wrapping quotes from command", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "'sudo systemctl restart nginx'",
    explanation: "Restart nginx",
    riskLevel: "low",
    alternatives: []
  }));
  assert.equal(result.command, "sudo systemctl restart nginx");
});

test("upgrades risk from low to medium for sudo commands", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "sudo apt update",
    explanation: "Update packages",
    riskLevel: "low",
    alternatives: []
  }));
  assert.equal(result.riskLevel, "medium");
});

test("upgrades risk to high for rm -rf commands", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "rm -rf /tmp/data",
    explanation: "Delete temp data",
    riskLevel: "low",
    alternatives: []
  }));
  assert.equal(result.riskLevel, "high");
});

/* ═══════════════════════════════════════════════════════════════════
   5. SEMANTIC SAFETY PARSER
   ═══════════════════════════════════════════════════════════════════ */

test("parseSemanticSafety: valid JSON", () => {
  const result = parser.parseSemanticSafety(JSON.stringify({
    safe: true,
    confidence: 0.95,
    reason: "Standard list command"
  }));
  assert.equal(result.safe, true);
  assert.equal(result.confidence, 0.95);
});

test("parseSemanticSafety: throws on missing JSON", () => {
  assert.throws(() => parser.parseSemanticSafety("no json here"), {
    message: "Semantic safety JSON not found"
  });
});

test("parseSemanticSafety: throws on malformed schema", () => {
  assert.throws(
    () => parser.parseSemanticSafety(JSON.stringify({ safe: "yes", confidence: "high" })),
    { message: "Semantic safety response was malformed" }
  );
});

test("parseSemanticSafety: confidence boundaries 0 and 1", () => {
  const low = parser.parseSemanticSafety(JSON.stringify({
    safe: false, confidence: 0, reason: "Zero confidence"
  }));
  assert.equal(low.confidence, 0);

  const high = parser.parseSemanticSafety(JSON.stringify({
    safe: true, confidence: 1, reason: "Full confidence"
  }));
  assert.equal(high.confidence, 1);
});

test("parseSemanticSafety: rejects confidence > 1", () => {
  assert.throws(
    () => parser.parseSemanticSafety(JSON.stringify({
      safe: true, confidence: 1.5, reason: "Over"
    })),
    { message: "Semantic safety response was malformed" }
  );
});

test("parseSemanticSafety: rejects confidence < 0", () => {
  assert.throws(
    () => parser.parseSemanticSafety(JSON.stringify({
      safe: true, confidence: -0.5, reason: "Under"
    })),
    { message: "Semantic safety response was malformed" }
  );
});

/* ═══════════════════════════════════════════════════════════════════
   6. STRESS / EDGE CASES
   ═══════════════════════════════════════════════════════════════════ */

test("handles JSON with unicode in fields", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "echo 'こんにちは'",
    explanation: "Prints Japanese greeting 🎌",
    riskLevel: "low",
    alternatives: []
  }));
  assert.equal(result.command, "echo 'こんにちは'");
});

test("handles very long explanation (5000+ chars)", () => {
  const longExplanation = "A".repeat(5000);
  const result = parser.parseCommand(JSON.stringify({
    command: "ls",
    explanation: longExplanation,
    riskLevel: "low",
    alternatives: []
  }));
  assert.equal(result.command, "ls");
  assert.equal(result.explanation.length, 5000);
});

test("handles nested JSON in command string (doesn't break extraction)", () => {
  const result = parser.parseCommand(JSON.stringify({
    command: "echo '{\"key\": \"value\"}'",
    explanation: "Prints JSON",
    riskLevel: "low",
    alternatives: []
  }));
  assert.ok(result.command.includes("key"));
});

test("handles multiple JSON objects — greedy regex grabs both, falls back gracefully", () => {
  const result = parser.parseCommand(`
{"command": "ls", "explanation": "first", "riskLevel": "low", "alternatives": []}
{"command": "pwd", "explanation": "second", "riskLevel": "low", "alternatives": []}
  `);
  // Greedy [\s\S]* in regex merges both objects → invalid JSON → fallback
  assert.equal(result._fallback, true);
});
