const fs = require("fs");
const path = require("path");

const knowledgePath = path.join(__dirname, "knowledge.json");
const RISK_PRIORITY = {
  low: 1,
  medium: 2,
  high: 3
};

function maxRisk(currentRisk = "low", newRisk = "low") {

  const currentPriority = RISK_PRIORITY[currentRisk] || 0;
  const newPriority = RISK_PRIORITY[newRisk] || 0;

  return newPriority > currentPriority ? newRisk : currentRisk;
}

function updateKnowledge(task, command, distro, risk = "low") {

  if (!task || !command) return;

  try {

    const data = fs.readFileSync(knowledgePath, "utf8");
    const knowledge = JSON.parse(data);

    // Check if task already exists
    const existing = knowledge.find(
      item => item.task.toLowerCase() === task.toLowerCase()
    );

    if (existing) {

      // Update distro command if missing
      if (!existing[distro]) {
        existing[distro] = command;
      }

      existing.risk = maxRisk(existing.risk, risk);

    } else {

      // Add new knowledge entry
      knowledge.push({
        task,
        [distro]: command,
        risk
      });

    }

    fs.writeFileSync(
      knowledgePath,
      JSON.stringify(knowledge, null, 2)
    );

  } catch (err) {

    console.error("Knowledge update failed:", err);

  }

}

module.exports = { updateKnowledge };
