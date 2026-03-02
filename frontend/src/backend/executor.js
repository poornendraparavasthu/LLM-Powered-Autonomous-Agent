const { exec } = require("child_process");

/**
 * Executes a shell command safely
 * @param {string} command
 * @returns {Promise<Object>}
 */
function runCommand(command) {
  return new Promise((resolve) => {

    exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        return resolve({
          success: false,
          error: stderr || error.message
        });
      }

      resolve({
        success: true,
        output: stdout
      });
    });
  });
}

module.exports = { runCommand };