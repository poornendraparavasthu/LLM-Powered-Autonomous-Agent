const { spawnSync } = require("child_process");

/*
-----------------------------------------
BASIC COMMAND VALIDATION
-----------------------------------------
Checks if command exists and is safe
*/

function validateCommand(command) {

  if (!command || typeof command !== "string") {
    return {
      valid: false,
      reason: "Invalid command format"
    };
  }

  // Extract base command
  const base = command.trim().split(" ")[0];

  // Block dangerous commands
  const blocked = [
    "rm",
    "mkfs",
    "dd",
    "shutdown",
    "reboot"
  ];

  if (blocked.includes(base)) {
    return {
      valid: false,
      reason: "Dangerous command blocked"
    };
  }

  /*
  -----------------------------------------
  CHECK IF COMMAND EXISTS
  -----------------------------------------
  */

  const result = spawnSync("which", [base]);

  if (result.status !== 0) {
    return {
      valid: false,
      reason: "Command not found on system"
    };
  }

  return {
    valid: true
  };

}

module.exports = { validateCommand };