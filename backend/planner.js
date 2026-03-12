const axios = require("axios");

/*
---------------------------------------
LOCAL LLM TASK PLANNER (OLLAMA)
---------------------------------------
Uses Mistral to break prompts into tasks
*/

async function planTasks(prompt) {

  try {

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "mistral",
        prompt: `
You are a Linux task planner.

Break the user request into SIMPLE tasks.

STRICT RULES:

- DO NOT output commands
- DO NOT include sudo, apt, pacman, dnf, systemctl
- ONLY describe tasks
- Each task must be short
- Output ONLY JSON

GOOD OUTPUT:
{
 "tasks": [
  "install nginx",
  "start nginx",
  "enable nginx"
 ]
}

BAD OUTPUT:
sudo apt install nginx
systemctl start nginx

User request:
${prompt}
`,
        stream: false
      }
    );

    const raw = response.data.response.trim();

    /*
    ---------------------------------------
    SAFE JSON PARSING
    ---------------------------------------
    */

    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return fallbackPlanner(prompt);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return fallbackPlanner(prompt);
    }

    /*
    ---------------------------------------
    SANITIZE TASKS
    ---------------------------------------
    */

    const cleanTasks = parsed.tasks
      .map(t => sanitizeTask(t))
      .filter(Boolean);

    if (cleanTasks.length === 0) {
      return fallbackPlanner(prompt);
    }

    return cleanTasks;

  } catch (err) {

    console.log("Planner fallback used");

    return fallbackPlanner(prompt);

  }

}


/*
---------------------------------------
TASK SANITIZER
---------------------------------------
Removes commands if model generates them
*/

function sanitizeTask(task) {

  if (!task) return null;

  const cleaned = task
    .toLowerCase()
    .replace(/sudo/g, "")
    .replace(/apt(-get)?/g, "")
    .replace(/pacman/g, "")
    .replace(/dnf/g, "")
    .replace(/systemctl/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return null;

  return cleaned;

}


/*
---------------------------------------
FALLBACK RULE PLANNER
---------------------------------------
Used if local LLM fails
*/

function fallbackPlanner(prompt) {

  const text = prompt.toLowerCase();

  const tasks = [];

  if (text.includes("install nginx")) {
    tasks.push("install nginx");
    return tasks;
  }

  if (text.includes("install")) {
    tasks.push(prompt);
  }

  if (text.includes("apache")) {
    tasks.push("install apache");
    tasks.push("start apache");
  }

  if (text.includes("docker")) {
    tasks.push("install docker");
    tasks.push("start docker");
  }

  if (text.includes("restart")) {
    tasks.push("restart service");
  }

  if (tasks.length === 0) {
    tasks.push(prompt);
  }

  return [...new Set(tasks)];

}

module.exports = { planTasks };