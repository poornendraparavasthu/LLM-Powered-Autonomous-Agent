const pty = require("node-pty");

/**
 * Runs a command in a pseudo-terminal (interactive)
 * @param {string} command
 * @param {function} onData - callback for streaming output
 * @returns {Promise<Object>}
 */
function runCommand(command, onData) {
  return new Promise((resolve) => {

    const shell = pty.spawn("bash", [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env
    });

    let fullOutput = "";

    shell.onData((data) => {
      fullOutput += data;

      // Stream output to caller (optional)
      if (onData) {
        onData(data);
      }
    });

    shell.onExit(({ exitCode }) => {
      resolve({
        success: exitCode === 0,
        output: fullOutput,
        exitCode
      });
    });

    // Execute command
    shell.write(command + "\r");
  });
}

module.exports = { runCommand };