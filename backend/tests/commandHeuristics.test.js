const test = require("node:test");
const assert = require("node:assert/strict");

const { applyInstructionHeuristics } = require("../services/commandHeuristics");

const archProfile = {
  prettyName: "Arch Linux",
  distroId: "arch",
  packageManager: "pacman"
};

test("command heuristics build a direct file-write command for user paths", () => {
  const result = applyInstructionHeuristics(
    "Create file /home/crat/Documents/file2.txt and enter helloworld inside it",
    {
      command: "echo nope",
      explanation: "placeholder",
      riskLevel: "low",
      alternatives: []
    }
  );

  assert.equal(
    result.command,
    "mkdir -p '/home/crat/Documents' && printf '%s\\n' 'helloworld' > '/home/crat/Documents/file2.txt'"
  );
  assert.equal(result.riskLevel, "low");
});

test("command heuristics use sudo tee for protected file writes", () => {
  const result = applyInstructionHeuristics(
    "Create file /etc/myapp/config.txt and write enabled=true inside it",
    {
      command: "echo nope",
      explanation: "placeholder",
      riskLevel: "low",
      alternatives: []
    }
  );

  assert.match(result.command, /^sudo mkdir -p '\/etc\/myapp' && printf '%s\\n' 'enabled=true' \| sudo tee '\/etc\/myapp\/config.txt' >\/dev\/null$/);
  assert.equal(result.riskLevel, "medium");
});

test("command heuristics use pacman for Arch system updates", () => {
  const result = applyInstructionHeuristics(
    "update my system",
    {
      command: "sudo apt-get update",
      explanation: "placeholder",
      riskLevel: "low",
      alternatives: []
    },
    archProfile
  );

  assert.equal(result.command, "sudo pacman -Syu");
  assert.equal(result.riskLevel, "medium");
});

test("command heuristics use pacman for Arch package installs", () => {
  const result = applyInstructionHeuristics(
    "install docker",
    {
      command: "sudo apt install docker",
      explanation: "placeholder",
      riskLevel: "low",
      alternatives: []
    },
    archProfile
  );

  assert.equal(result.command, "sudo pacman -S docker");
  assert.equal(result.riskLevel, "medium");
});
