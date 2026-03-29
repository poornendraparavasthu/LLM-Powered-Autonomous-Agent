const fs = require("fs");
const os = require("os");

function parseOsRelease(text) {
  return String(text || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .reduce((accumulator, line) => {
      const separator = line.indexOf("=");

      if (separator === -1) {
        return accumulator;
      }

      const key = line.slice(0, separator);
      const rawValue = line.slice(separator + 1).trim();
      const value = rawValue.replace(/^"/, "").replace(/"$/, "");

      accumulator[key] = value;
      return accumulator;
    }, {});
}

function detectPackageManager({ platform, distroId = "" }) {
  const normalized = String(distroId || "").toLowerCase();

  if (platform === "win32") {
    return "winget";
  }

  if (platform === "darwin") {
    return "brew";
  }

  if (["arch", "manjaro", "endeavouros"].includes(normalized)) {
    return "pacman";
  }

  if (
    ["ubuntu", "debian", "kali", "pop", "linuxmint", "elementary", "zorin"].includes(
      normalized
    )
  ) {
    return "apt";
  }

  if (
    ["fedora", "rhel", "rocky", "almalinux", "centos", "ol"].includes(normalized)
  ) {
    return "dnf";
  }

  if (["opensuse", "opensuse-tumbleweed", "opensuse-leap", "sles"].includes(normalized)) {
    return "zypper";
  }

  if (normalized === "alpine") {
    return "apk";
  }

  return platform === "linux" ? "generic-linux" : "unknown";
}

function buildPackageExamples(packageManager) {
  switch (packageManager) {
    case "pacman":
      return {
        updateSystem: "sudo pacman -Syu",
        installPackage: "sudo pacman -S <package>",
        removePackage: "sudo pacman -Rns <package>",
        searchPackage: "pacman -Ss <package>"
      };
    case "apt":
      return {
        updateSystem: "sudo apt update && sudo apt upgrade -y",
        installPackage: "sudo apt install -y <package>",
        removePackage: "sudo apt remove -y <package>",
        searchPackage: "apt search <package>"
      };
    case "dnf":
      return {
        updateSystem: "sudo dnf upgrade --refresh -y",
        installPackage: "sudo dnf install -y <package>",
        removePackage: "sudo dnf remove -y <package>",
        searchPackage: "dnf search <package>"
      };
    case "zypper":
      return {
        updateSystem: "sudo zypper refresh && sudo zypper update -y",
        installPackage: "sudo zypper install -y <package>",
        removePackage: "sudo zypper remove -y <package>",
        searchPackage: "zypper search <package>"
      };
    case "apk":
      return {
        updateSystem: "sudo apk update && sudo apk upgrade",
        installPackage: "sudo apk add <package>",
        removePackage: "sudo apk del <package>",
        searchPackage: "apk search <package>"
      };
    case "winget":
      return {
        updateSystem: "winget upgrade --all",
        installPackage: "winget install <package>",
        removePackage: "winget uninstall <package>",
        searchPackage: "winget search <package>"
      };
    case "brew":
      return {
        updateSystem: "brew update && brew upgrade",
        installPackage: "brew install <package>",
        removePackage: "brew uninstall <package>",
        searchPackage: "brew search <package>"
      };
    default:
      return {
        updateSystem: "Use the system package manager to update installed packages.",
        installPackage: "Use the system package manager to install <package>.",
        removePackage: "Use the system package manager to remove <package>.",
        searchPackage: "Use the system package manager to search for <package>."
      };
  }
}

class SystemProfile {
  constructor() {
    this.snapshot = this.detect();
  }

  detect() {
    const platform = process.platform;
    const profile = {
      platform,
      platformFamily: platform === "win32" ? "windows" : platform,
      prettyName: os.type(),
      distroId: "",
      packageManager: "unknown"
    };

    if (platform === "linux") {
      try {
        const release = parseOsRelease(fs.readFileSync("/etc/os-release", "utf8"));
        profile.prettyName = release.PRETTY_NAME || release.NAME || "Linux";
        profile.distroId = release.ID || "";
      } catch {
        profile.prettyName = "Linux";
      }
    } else if (platform === "darwin") {
      profile.prettyName = "macOS";
      profile.distroId = "macos";
    } else if (platform === "win32") {
      profile.prettyName = "Windows";
      profile.distroId = "windows";
    }

    profile.packageManager = detectPackageManager({
      platform,
      distroId: profile.distroId
    });
    profile.packageExamples = buildPackageExamples(profile.packageManager);

    return profile;
  }

  getSnapshot() {
    return { ...this.snapshot };
  }
}

module.exports = { SystemProfile };
