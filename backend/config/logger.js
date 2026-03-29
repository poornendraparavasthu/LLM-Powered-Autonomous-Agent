const fs = require("fs");
const path = require("path");

const { env } = require("./env");

let logDirReady = false;

function ensureLogDir() {
  if (!logDirReady) {
    fs.mkdirSync(env.auditLogDir, { recursive: true });
    logDirReady = true;
  }
}

function logFilePath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(env.auditLogDir, `audit-${date}.log`);
}

function writeLog(level, payload) {
  ensureLogDir();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...payload
  });
  fs.appendFile(logFilePath(), `${line}\n`, error => {
    if (error) {
      console.error("Audit log write failed:", error.message);
    }
  });
}

function logAudit(payload) {
  writeLog("audit", payload);
}

function logInfo(message, extra = {}) {
  writeLog("info", { message, ...extra });
}

function logError(message, extra = {}) {
  writeLog("error", { message, ...extra });
}

module.exports = {
  logAudit,
  logInfo,
  logError
};
