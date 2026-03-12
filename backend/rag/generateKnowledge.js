const fs = require("fs");
const path = require("path");

const knowledgePath = path.join(__dirname, "knowledge.json");

/*
---------------------------------------
PACKAGE LIST
---------------------------------------
*/

const packages = [
  "nginx","docker","nodejs","python","git","neovim","htop","tmux",
  "curl","wget","postgresql","redis","mysql","firefox","chromium",
  "vim","nano","openssh","gcc","make","cmake","npm","yarn",
  "go","rust","php","ruby","perl","clang","gdb","tree",
  "rsync","net-tools","bind","tcpdump","nmap","whois",
  "jq","zip","unzip","tar","screen","fish","zsh"
];

/*
---------------------------------------
SERVICE LIST
---------------------------------------
*/

const services = [
  "nginx",
  "docker",
  "ssh",
  "postgresql",
  "redis",
  "mysql"
];

/*
---------------------------------------
TASK VARIATIONS
---------------------------------------
*/

const installActions = [
  "install",
  "download",
  "setup",
  "add"
];

const removeActions = [
  "remove",
  "delete",
  "uninstall"
];

const startActions = [
  "start",
  "launch"
];

const stopActions = [
  "stop",
  "disable"
];

const restartActions = [
  "restart",
  "reload"
];

const tasks = [];

/*
---------------------------------------
INSTALL PACKAGE TASKS
---------------------------------------
*/

packages.forEach(pkg => {

  installActions.forEach(action => {

    tasks.push({
      task: `${action} ${pkg}`,
      arch: `sudo pacman -S ${pkg}`,
      ubuntu: `sudo apt install ${pkg}`,
      fedora: `sudo dnf install ${pkg}`,
      risk: "low"
    });

  });

});

/*
---------------------------------------
REMOVE PACKAGE TASKS
---------------------------------------
*/

packages.forEach(pkg => {

  removeActions.forEach(action => {

    tasks.push({
      task: `${action} ${pkg}`,
      arch: `sudo pacman -R ${pkg}`,
      ubuntu: `sudo apt remove ${pkg}`,
      fedora: `sudo dnf remove ${pkg}`,
      risk: "medium"
    });

  });

});

/*
---------------------------------------
SERVICE CONTROL TASKS
---------------------------------------
*/

services.forEach(service => {

  startActions.forEach(action => {

    tasks.push({
      task: `${action} ${service}`,
      arch: `sudo systemctl start ${service}`,
      ubuntu: `sudo systemctl start ${service}`,
      fedora: `sudo systemctl start ${service}`,
      risk: "low"
    });

  });

  stopActions.forEach(action => {

    tasks.push({
      task: `${action} ${service}`,
      arch: `sudo systemctl stop ${service}`,
      ubuntu: `sudo systemctl stop ${service}`,
      fedora: `sudo systemctl stop ${service}`,
      risk: "medium"
    });

  });

  restartActions.forEach(action => {

    tasks.push({
      task: `${action} ${service}`,
      arch: `sudo systemctl restart ${service}`,
      ubuntu: `sudo systemctl restart ${service}`,
      fedora: `sudo systemctl restart ${service}`,
      risk: "low"
    });

  });

});

/*
---------------------------------------
SYSTEM TASKS
---------------------------------------
*/

const systemTasks = [
  {
    task: "update system",
    arch: "sudo pacman -Syu",
    ubuntu: "sudo apt update && sudo apt upgrade",
    fedora: "sudo dnf upgrade",
    risk: "low"
  },
  {
    task: "upgrade system",
    arch: "sudo pacman -Syu",
    ubuntu: "sudo apt upgrade",
    fedora: "sudo dnf upgrade",
    risk: "low"
  },
  {
    task: "check disk usage",
    arch: "df -h",
    ubuntu: "df -h",
    fedora: "df -h",
    risk: "low"
  },
  {
    task: "check memory usage",
    arch: "free -h",
    ubuntu: "free -h",
    fedora: "free -h",
    risk: "low"
  },
  {
    task: "list running processes",
    arch: "ps aux",
    ubuntu: "ps aux",
    fedora: "ps aux",
    risk: "low"
  },
  {
    task: "show ip address",
    arch: "ip a",
    ubuntu: "ip a",
    fedora: "ip a",
    risk: "low"
  },
  {
    task: "check open ports",
    arch: "ss -tuln",
    ubuntu: "ss -tuln",
    fedora: "ss -tuln",
    risk: "low"
  },
  {
    task: "check system uptime",
    arch: "uptime",
    ubuntu: "uptime",
    fedora: "uptime",
    risk: "low"
  }
];

tasks.push(...systemTasks);

/*
---------------------------------------
REMOVE DUPLICATES
---------------------------------------
*/

const uniqueTasks = [];
const seen = new Set();

tasks.forEach(task => {

  if (!seen.has(task.task)) {
    seen.add(task.task);
    uniqueTasks.push(task);
  }

});

/*
---------------------------------------
WRITE KNOWLEDGE FILE
---------------------------------------
*/

fs.writeFileSync(
  knowledgePath,
  JSON.stringify(uniqueTasks, null, 2)
);

console.log(`Generated ${uniqueTasks.length} knowledge entries`);