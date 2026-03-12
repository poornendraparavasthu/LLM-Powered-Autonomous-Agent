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
      return finalizeTasks(fallbackPlanner(prompt));
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return finalizeTasks(fallbackPlanner(prompt));
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
      return finalizeTasks(fallbackPlanner(prompt));
    }

    return finalizeTasks(cleanTasks);

  } catch (err) {

    console.log("Planner fallback used");

    return finalizeTasks(fallbackPlanner(prompt));

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

  if (cleaned.length < 3) return null;

  return cleaned;

}


/*
---------------------------------------
TASK FINALIZER
---------------------------------------
Deduplicate + normalize + sort tasks
*/

function finalizeTasks(tasks) {

  const unique = [...new Set(tasks)];

  const normalized = unique.map(t => normalizeTask(t));

  return sortTasks(normalized);

}


/*
---------------------------------------
TASK NORMALIZER
---------------------------------------
Fix repeated intent patterns
*/

function normalizeTask(task) {

  const t = task.toLowerCase();

  if (t.includes("install") && t.includes("docker")) return "install docker";

  if (t.includes("start") && t.includes("docker")) return "start docker";

  if (t.includes("enable") && t.includes("docker")) return "enable docker";

  if (t.includes("install") && t.includes("nginx")) return "install nginx";

  if (t.includes("start") && t.includes("nginx")) return "start nginx";

  if (t.includes("enable") && t.includes("nginx")) return "enable nginx";

  if (t.includes("update") || t.includes("upgrade")) return "update system";

  return task;

}


/*
---------------------------------------
TASK SORTER
---------------------------------------
Ensures logical order
*/

function sortTasks(tasks) {

  const priority = {
    "update system": 1,
    "install": 2,
    "start": 3,
    "enable": 4,
    "restart": 5
  };

  return tasks.sort((a, b) => {

    const aKey = Object.keys(priority).find(k => a.startsWith(k)) || "zzz";
    const bKey = Object.keys(priority).find(k => b.startsWith(k)) || "zzz";

    return (priority[aKey] || 99) - (priority[bKey] || 99);

  });

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

  if (text.includes("update")) {
    tasks.push("update system");
  }

  if (text.includes("docker")) {
    tasks.push("install docker");
    tasks.push("start docker");
    tasks.push("enable docker");
  }

  if (text.includes("nginx")) {
    tasks.push("install nginx");
    tasks.push("start nginx");
    tasks.push("enable nginx");
  }

  if (text.includes("apache")) {
    tasks.push("install apache");
    tasks.push("start apache");
  }

  if (text.includes("restart")) {
    tasks.push("restart service");
  }

  if (tasks.length === 0) {
    tasks.push(prompt);
  }

  return tasks;

}

module.exports = { planTasks };