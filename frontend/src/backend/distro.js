const fs = require("fs");

function detectDistro() {
  try {
    const data = fs.readFileSync("/etc/os-release", "utf8");
    const lines = data.split("\n");

    for (let line of lines) {
      if (line.startsWith("ID=")) {
        return line.split("=")[1].replace(/"/g, "").trim();
      }
    }

    return "unknown";
  } catch (err) {
    return "unknown";
  }
}

module.exports = { detectDistro };