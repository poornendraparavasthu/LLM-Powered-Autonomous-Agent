const stopword = require("stopword");

function normalizePrompt(text) {

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/);

  const filtered = stopword.removeStopwords(words);

  return filtered.join(" ");
}

module.exports = { normalizePrompt };