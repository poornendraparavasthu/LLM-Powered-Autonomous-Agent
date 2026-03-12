function simplifyTask(task) {

  const t = task.toLowerCase();

  let intent = null;

  if (t.includes("install") || t.includes("download") || t.includes("setup"))
    intent = "install";

  else if (t.includes("remove") || t.includes("uninstall") || t.includes("delete"))
    intent = "remove";

  else if (t.includes("start") || t.includes("launch") || t.includes("run"))
    intent = "start";

  else if (t.includes("stop") || t.includes("shutdown"))
    intent = "stop";

  else if (t.includes("restart"))
    intent = "restart";

  else if (t.includes("update") || t.includes("upgrade"))
    intent = "update system";

  else if (t.includes("disk"))
    intent = "check disk usage";

  else if (t.includes("memory") || t.includes("ram"))
    intent = "check memory usage";


  const knownPackages = [
    "nginx","apache","docker","nodejs","python","git",
    "neovim","htop","tmux","curl","wget",
    "postgresql","redis","mysql","firefox","chromium"
  ];

  let entity = null;

  for (const pkg of knownPackages) {
    if (t.includes(pkg)) {
      entity = pkg;
      break;
    }
  }

  if (intent === "update system")
    return "update system";

  if (intent === "check disk usage")
    return "check disk usage";

  if (intent === "check memory usage")
    return "check memory usage";

  if (intent && entity)
    return `${intent} ${entity}`;

  return task;
}

module.exports = { simplifyTask };

