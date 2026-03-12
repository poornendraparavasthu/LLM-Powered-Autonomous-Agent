const knowledge = require("./knowledge.json");
const { fuzzy } = require("fast-fuzzy");
const { normalizePrompt } = require("./normalize");

function searchKnowledge(userInput, distro) {

  const query = normalizePrompt(userInput);

  let bestMatch = null;
  let bestScore = 0;

  for (const item of knowledge) {

    const score = fuzzy(query, item.task);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }

  }

  if (!bestMatch || bestScore < 0.8) {
    return null;
  }
  console.log("RAG score:", bestScore, "task:", bestMatch?.task);
  return {
    commands: [bestMatch[distro] || bestMatch.arch],
    risk: bestMatch.risk
  };
}

module.exports = { searchKnowledge };