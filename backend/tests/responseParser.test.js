const test = require("node:test");
const assert = require("node:assert/strict");

const { ResponseParser } = require("../services/ResponseParser");

test("ResponseParser parses structured command JSON", () => {
  const parser = new ResponseParser();
  const result = parser.parseCommand(`
ignored
{
  "command": "ls -la",
  "explanation": "Lists files",
  "riskLevel": "low",
  "alternatives": ["find . -maxdepth 1"]
}
`);

  assert.equal(result.command, "ls -la");
  assert.equal(result.riskLevel, "low");
  assert.deepEqual(result.alternatives, ["find . -maxdepth 1"]);
});

test("ResponseParser falls back when JSON is missing", () => {
  const parser = new ResponseParser();
  const result = parser.parseCommand("ls -la");

  assert.equal(result.command, "ls -la");
  assert.equal(result._fallback, true);
});

test("ResponseParser sanitizes wrapped commands and upgrades sudo risk", () => {
  const parser = new ResponseParser();
  const result = parser.parseCommand(`
{
  "command": "'sudo systemctl restart nginx'",
  "explanation": "Restart nginx.",
  "riskLevel": "low",
  "alternatives": []
}
`);

  assert.equal(result.command, "sudo systemctl restart nginx");
  assert.equal(result.riskLevel, "medium");
});
