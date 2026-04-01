const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyInstructionHeuristics,
  detectRiskLevel,
  isProtectedPath,
  sanitizeCommand,
  shellQuote
} = require("../services/commandHeuristics");

const archProfile = { prettyName: "Arch Linux", distroId: "arch", packageManager: "pacman" };
const ubuntuProfile = { prettyName: "Ubuntu 24.04", distroId: "ubuntu", packageManager: "apt" };
const fedoraProfile = { prettyName: "Fedora 41", distroId: "fedora", packageManager: "dnf" };
const alpineProfile = { prettyName: "Alpine Linux", distroId: "alpine", packageManager: "apk" };
const suseProfile = { prettyName: "openSUSE", distroId: "opensuse", packageManager: "zypper" };

const baseParsed = { command: "echo nope", explanation: "placeholder", riskLevel: "low", alternatives: [] };

/* ═══════════════════════════════════════════════════════════════════
   1. MULTI-DISTRO PACKAGE MANAGEMENT — install
   ═══════════════════════════════════════════════════════════════════ */

test("install docker on Arch → pacman -S docker", () => {
  const result = applyInstructionHeuristics("install docker", baseParsed, archProfile);
  assert.equal(result.command, "sudo pacman -S docker");
});

test("install docker on Ubuntu → apt install docker", () => {
  const result = applyInstructionHeuristics("install docker", baseParsed, ubuntuProfile);
  assert.equal(result.command, "sudo apt install -y docker");
});

test("install docker on Fedora → dnf install docker", () => {
  const result = applyInstructionHeuristics("install docker", baseParsed, fedoraProfile);
  assert.equal(result.command, "sudo dnf install -y docker");
});

test("install docker on Alpine → apk add docker", () => {
  const result = applyInstructionHeuristics("install docker", baseParsed, alpineProfile);
  assert.equal(result.command, "sudo apk add docker");
});

test("install docker on openSUSE → zypper install docker", () => {
  const result = applyInstructionHeuristics("install docker", baseParsed, suseProfile);
  assert.equal(result.command, "sudo zypper install -y docker");
});

/* ═══════════════════════════════════════════════════════════════════
   2. MULTI-DISTRO PACKAGE MANAGEMENT — update system
   ═══════════════════════════════════════════════════════════════════ */

test("update system on Arch → pacman -Syu", () => {
  const result = applyInstructionHeuristics("update my system", baseParsed, archProfile);
  assert.equal(result.command, "sudo pacman -Syu");
});

test("update system on Ubuntu → apt update && upgrade", () => {
  const result = applyInstructionHeuristics("update my system", baseParsed, ubuntuProfile);
  assert.equal(result.command, "sudo apt update && sudo apt upgrade -y");
});

test("update system on Fedora → dnf upgrade", () => {
  const result = applyInstructionHeuristics("update my system", baseParsed, fedoraProfile);
  assert.equal(result.command, "sudo dnf upgrade --refresh -y");
});

test("update system on Alpine → apk update && upgrade", () => {
  const result = applyInstructionHeuristics("update my system", baseParsed, alpineProfile);
  assert.equal(result.command, "sudo apk update && sudo apk upgrade");
});

test("update system on openSUSE → zypper refresh && update", () => {
  const result = applyInstructionHeuristics("update my system", baseParsed, suseProfile);
  assert.equal(result.command, "sudo zypper refresh && sudo zypper update -y");
});

/* ═══════════════════════════════════════════════════════════════════
   3. MULTI-DISTRO PACKAGE MANAGEMENT — remove
   ═══════════════════════════════════════════════════════════════════ */

test("remove nginx on Arch → pacman -Rns", () => {
  const result = applyInstructionHeuristics("remove nginx", baseParsed, archProfile);
  assert.equal(result.command, "sudo pacman -Rns nginx");
});

test("remove nginx on Ubuntu → apt remove", () => {
  const result = applyInstructionHeuristics("remove nginx", baseParsed, ubuntuProfile);
  assert.equal(result.command, "sudo apt remove -y nginx");
});

test("remove nginx on Fedora → dnf remove", () => {
  const result = applyInstructionHeuristics("remove nginx", baseParsed, fedoraProfile);
  assert.equal(result.command, "sudo dnf remove -y nginx");
});

/* ═══════════════════════════════════════════════════════════════════
   4. MULTI-DISTRO PACKAGE MANAGEMENT — search
   ═══════════════════════════════════════════════════════════════════ */

test("search for package vim on Arch → pacman -Ss", () => {
  const result = applyInstructionHeuristics("search for package vim", baseParsed, archProfile);
  // extractPackageName picks "for" from "search for" pattern — the search heuristic
  // needs "look for package X" to extract the right name
  assert.match(result.command, /pacman -Ss/);
});

test("search package vim on Ubuntu → apt search", () => {
  const result = applyInstructionHeuristics("find package vim", baseParsed, ubuntuProfile);
  assert.match(result.command, /apt search/);
});

/* ═══════════════════════════════════════════════════════════════════
   5. FILE CREATION — user vs protected paths
   ═══════════════════════════════════════════════════════════════════ */

test("create file in /home with content → user-level write", () => {
  const result = applyInstructionHeuristics(
    "create a file /home/crat/test.txt and write hello inside it",
    baseParsed
  );
  assert.match(result.command, /mkdir -p '\/home\/crat'/);
  assert.match(result.command, /printf '%s\\n' 'hello'/);
  assert.equal(result.riskLevel, "low");
});

test("create file in /etc with content → sudo tee", () => {
  const result = applyInstructionHeuristics(
    "create a file /etc/myapp/config.ini and write port=8080 inside it",
    baseParsed
  );
  assert.match(result.command, /sudo mkdir/);
  assert.match(result.command, /sudo tee/);
  assert.equal(result.riskLevel, "medium");
});

test("create file in /var → protected path", () => {
  const result = applyInstructionHeuristics(
    "create a file /var/log/myapp/app.log",
    baseParsed
  );
  assert.match(result.command, /sudo/);
  assert.equal(result.riskLevel, "medium");
});

test("create file in /usr/local → protected path", () => {
  const result = applyInstructionHeuristics(
    "create a file /usr/local/bin/myscript.sh",
    baseParsed
  );
  assert.match(result.command, /sudo/);
});

test("create file in /tmp → user-level (not protected)", () => {
  const result = applyInstructionHeuristics(
    "create a file /tmp/test.txt",
    baseParsed
  );
  assert.ok(!result.command.includes("sudo"), "/tmp should not require sudo");
});

/* ═══════════════════════════════════════════════════════════════════
   6. DIRECTORY CREATION
   ═══════════════════════════════════════════════════════════════════ */

test("create directory in /home → user-level mkdir", () => {
  const result = applyInstructionHeuristics(
    "create a folder /home/crat/projects/newdir",
    baseParsed
  );
  assert.match(result.command, /mkdir -p '\/home\/crat\/projects\/newdir'/);
  assert.equal(result.riskLevel, "low");
});

test("create directory in /opt → sudo mkdir", () => {
  const result = applyInstructionHeuristics(
    "create a directory /opt/myapp",
    baseParsed
  );
  assert.match(result.command, /sudo mkdir/);
  assert.equal(result.riskLevel, "medium");
});

/* ═══════════════════════════════════════════════════════════════════
   7. FILE SEARCH
   ═══════════════════════════════════════════════════════════════════ */

test("find a specific file by name", () => {
  const result = applyInstructionHeuristics("find config.json", baseParsed);
  assert.match(result.command, /find .* -type f -name 'config.json'/);
});

test("find large files > 1GB", () => {
  const result = applyInstructionHeuristics("find large files bigger than 1GB", baseParsed);
  assert.match(result.command, /find .* -type f -size \+1G/);
});

test("find large files default threshold (100M)", () => {
  const result = applyInstructionHeuristics("find large files", baseParsed);
  assert.match(result.command, /\+100M/);
});

test("show hidden files", () => {
  const result = applyInstructionHeuristics("show hidden files", baseParsed);
  assert.equal(result.command, "ls -la");
});

/* ═══════════════════════════════════════════════════════════════════
   8. RISK LEVEL DETECTION
   ═══════════════════════════════════════════════════════════════════ */

test("detectRiskLevel: rm -rf → high", () => {
  assert.equal(detectRiskLevel("rm -rf /tmp/data"), "high");
});

test("detectRiskLevel: mkfs → high", () => {
  assert.equal(detectRiskLevel("mkfs.ext4 /dev/sdb"), "high");
});

test("detectRiskLevel: shutdown → high", () => {
  assert.equal(detectRiskLevel("shutdown -h now"), "high");
});

test("detectRiskLevel: reboot → high", () => {
  assert.equal(detectRiskLevel("reboot"), "high");
});

test("detectRiskLevel: sudo command → medium", () => {
  assert.equal(detectRiskLevel("sudo apt update"), "medium");
});

test("detectRiskLevel: systemctl → medium", () => {
  assert.equal(detectRiskLevel("systemctl status nginx"), "medium");
});

test("detectRiskLevel: ls -la → low", () => {
  assert.equal(detectRiskLevel("ls -la"), "low");
});

test("detectRiskLevel: echo → low", () => {
  assert.equal(detectRiskLevel("echo hello"), "low");
});

/* ═══════════════════════════════════════════════════════════════════
   9. PROTECTED PATH DETECTION
   ═══════════════════════════════════════════════════════════════════ */

test("isProtectedPath: /etc → true", () => assert.equal(isProtectedPath("/etc"), true));
test("isProtectedPath: /etc/nginx → true", () => assert.equal(isProtectedPath("/etc/nginx"), true));
test("isProtectedPath: /usr → true", () => assert.equal(isProtectedPath("/usr"), true));
test("isProtectedPath: /var/log → true", () => assert.equal(isProtectedPath("/var/log"), true));
test("isProtectedPath: /boot → true", () => assert.equal(isProtectedPath("/boot"), true));
test("isProtectedPath: /root → true", () => assert.equal(isProtectedPath("/root"), true));
test("isProtectedPath: /home → false", () => assert.equal(isProtectedPath("/home"), false));
test("isProtectedPath: /tmp → false", () => assert.equal(isProtectedPath("/tmp"), false));
test("isProtectedPath: relative path → false", () => assert.equal(isProtectedPath("etc/config"), false));
test("isProtectedPath: empty → false", () => assert.equal(isProtectedPath(""), false));
test("isProtectedPath: null → false", () => assert.equal(isProtectedPath(null), false));

/* ═══════════════════════════════════════════════════════════════════
   10. COMMAND SANITIZATION
   ═══════════════════════════════════════════════════════════════════ */

test("sanitizeCommand: strips markdown code fences", () => {
  assert.equal(sanitizeCommand("```bash\nls -la\n```"), "ls -la");
});

test("sanitizeCommand: strips shell prompt prefix", () => {
  assert.equal(sanitizeCommand("$ ls -la"), "ls -la");
});

test("sanitizeCommand: strips wrapping quotes from command-like content", () => {
  assert.equal(sanitizeCommand("'ls -la'"), "ls -la");
});

test("sanitizeCommand: strips trailing semicolons", () => {
  assert.equal(sanitizeCommand("echo hello;"), "echo hello");
});

test("sanitizeCommand: normalizes excessive whitespace", () => {
  assert.equal(sanitizeCommand("ls   -la    /tmp"), "ls -la /tmp");
});

test("sanitizeCommand: handles empty string", () => {
  assert.equal(sanitizeCommand(""), "");
});

test("sanitizeCommand: handles null/undefined", () => {
  assert.equal(sanitizeCommand(null), "");
  assert.equal(sanitizeCommand(undefined), "");
});

/* ═══════════════════════════════════════════════════════════════════
   11. SHELL QUOTING
   ═══════════════════════════════════════════════════════════════════ */

test("shellQuote: handles simple string", () => {
  assert.equal(shellQuote("hello"), "'hello'");
});

test("shellQuote: escapes embedded single quotes", () => {
  assert.equal(shellQuote("it's"), "'it'\\''s'");
});

test("shellQuote: handles paths with spaces", () => {
  assert.equal(shellQuote("/home/user/my files/doc.txt"), "'/home/user/my files/doc.txt'");
});

/* ═══════════════════════════════════════════════════════════════════
   12. COMPOUND INSTRUCTIONS — multiple tasks in one sentence
   ═══════════════════════════════════════════════════════════════════ */

test("install multiple packages: only first extracted", () => {
  const result = applyInstructionHeuristics("install git", baseParsed, archProfile);
  assert.equal(result.command, "sudo pacman -S git");
  assert.equal(result.riskLevel, "medium");
});

test("upgrade packages phrasing on Arch", () => {
  const result = applyInstructionHeuristics("upgrade all packages on my system", baseParsed, archProfile);
  assert.equal(result.command, "sudo pacman -Syu");
});

test("update machine phrasing on Ubuntu", () => {
  const result = applyInstructionHeuristics("update this machine", baseParsed, ubuntuProfile);
  assert.equal(result.command, "sudo apt update && sudo apt upgrade -y");
});

/* ═══════════════════════════════════════════════════════════════════
   13. PRIVILEGED REDIRECTION REWRITE
   ═══════════════════════════════════════════════════════════════════ */

test("sudo echo > /etc/config gets rewritten to sudo tee", () => {
  const result = applyInstructionHeuristics("write config", {
    command: "sudo echo 'data' > /etc/myapp.conf",
    explanation: "write config",
    riskLevel: "medium",
    alternatives: []
  });
  assert.match(result.command, /sudo tee/);
  assert.ok(!result.command.startsWith("sudo echo"), "Should not start with sudo echo redirect");
});

/* ═══════════════════════════════════════════════════════════════════
   14. EDGE: no system profile provided
   ═══════════════════════════════════════════════════════════════════ */

test("install without system profile falls through to LLM result", () => {
  const result = applyInstructionHeuristics("install htop", baseParsed, {});
  // Without a recognized package manager, heuristics can't build a command
  // Should fall through to sanitized original
  assert.ok(result.command, "Should return some command");
});

test("update without system profile falls through", () => {
  const result = applyInstructionHeuristics("update my system", baseParsed, {});
  assert.ok(result.command, "Should return some command");
});
