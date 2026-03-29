const path = require("path");

const PROTECTED_PATH_PREFIXES = [
  "/boot",
  "/etc",
  "/lib",
  "/lib64",
  "/opt",
  "/root",
  "/sbin",
  "/srv",
  "/sys",
  "/usr",
  "/var"
];

function cleanToken(token) {
  return String(token || "").replace(/^[`"'([{]+|[`"')\]}.,;:!?]+$/g, "");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isProtectedPath(targetPath) {
  if (!targetPath || !targetPath.startsWith("/")) {
    return false;
  }

  return PROTECTED_PATH_PREFIXES.some(prefix =>
    targetPath === prefix || targetPath.startsWith(`${prefix}/`)
  );
}

function detectRiskLevel(command, requestedRiskLevel = "low") {
  const normalized = normalizeWhitespace(command);
  const lower = normalized.toLowerCase();

  if (
    /\brm\s+-[a-z]*[rf][a-z]*\b/.test(lower) ||
    /\bmkfs(\.[a-z0-9]+)?\b/.test(lower) ||
    /\bdd\b.*\bof=\/dev\//.test(lower) ||
    /\b(shutdown|reboot|poweroff|halt)\b/.test(lower)
  ) {
    return "high";
  }

  if (
    /\bsudo\b/.test(lower) ||
    /\b(systemctl|service|mount|umount|useradd|usermod|userdel|groupadd|groupdel|passwd|apt(-get)?|pacman|dnf|yum)\b/.test(lower) ||
    /\/(etc|usr|var|opt|boot|root|srv|lib|lib64)\b/.test(lower)
  ) {
    return requestedRiskLevel === "high" ? "high" : "medium";
  }

  return requestedRiskLevel || "low";
}

function sanitizeCommand(command) {
  let current = normalizeWhitespace(command);

  if (!current) {
    return "";
  }

  current = current.replace(/^`{3,}[a-z]*\s*/i, "").replace(/`{3,}$/i, "").trim();
  current = current.replace(/^(?:[$#]|[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:[^$#\n]+[$#])\s*/, "").trim();

  for (let index = 0; index < 3; index += 1) {
    const first = current[0];
    const last = current[current.length - 1];

    if (!first || first !== last || ![`"`, "'"].includes(first)) {
      break;
    }

    const inner = current.slice(1, -1).trim();

    if (!inner || inner === current) {
      break;
    }

    if (!/[ /|&><=:-]/.test(inner) && !inner.startsWith("/")) {
      break;
    }

    current = inner;
  }

  return current.replace(/;\s*$/, "").trim();
}

function sanitizeAlternatives(alternatives) {
  return (Array.isArray(alternatives) ? alternatives : [])
    .map(alternative => sanitizeCommand(alternative))
    .filter(Boolean)
    .slice(0, 4);
}

function extractAbsolutePaths(task) {
  return normalizeWhitespace(task)
    .split(/\s+/)
    .map(cleanToken)
    .filter(word => word.startsWith("/"));
}

function looksLikeFilePath(candidate) {
  const basename = candidate.split("/").pop();
  return Boolean(basename && basename.includes(".") && !candidate.endsWith("/"));
}

function extractPathAndFile(task) {
  const paths = extractAbsolutePaths(task);

  for (const candidate of paths) {
    if (looksLikeFilePath(candidate)) {
      return candidate;
    }
  }

  const namedMatch = task.match(/\b(?:named|called)\s+([^\s/]+\.[\w.-]+)/i);
  const filenameFromLabel = namedMatch ? cleanToken(namedMatch[1]) : null;
  const filenameFromWords = [...normalizeWhitespace(task).split(/\s+/)]
    .map(cleanToken)
    .reverse()
    .find(word => !word.startsWith("/") && /^[^/\s]+\.[\w.-]+$/.test(word));

  const filename = filenameFromLabel || filenameFromWords;
  const directory = [...paths].reverse().find(candidate => !looksLikeFilePath(candidate));

  if (filename && directory) {
    return path.posix.join(directory.replace(/\/$/, ""), filename);
  }

  return null;
}

function extractDirectoryTarget(task) {
  const paths = extractAbsolutePaths(task);

  for (const candidate of paths) {
    if (!looksLikeFilePath(candidate)) {
      return candidate.replace(/\/$/, "") || "/";
    }
  }

  return null;
}

function extractContentText(task) {
  const patterns = [
    /\b(?:write|put|enter|insert|save)\s+"([^"]+)"\s+(?:inside|into|in)\s+(?:it|the file)\b/i,
    /\b(?:write|put|enter|insert|save)\s+'([^']+)'\s+(?:inside|into|in)\s+(?:it|the file)\b/i,
    /\b(?:write|put|enter|insert|save)\s+(.+?)\s+(?:inside|into|in)\s+(?:it|the file)\b/i,
    /\b(?:with|containing)\s+(?:the\s+)?(?:text\s+|content\s+)?"([^"]+)"/i,
    /\b(?:with|containing)\s+(?:the\s+)?(?:text\s+|content\s+)?'([^']+)'/i,
    /\b(?:with|containing)\s+(?:the\s+)?(?:text\s+|content\s+)?(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = task.match(pattern);

    if (match?.[1]) {
      return match[1]
        .replace(/\s+/g, " ")
        .replace(/[.,;:!?]+$/, "")
        .trim();
    }
  }

  return null;
}

function extractFindTarget(task) {
  const quoted =
    task.match(/\b(?:named|called)\s+"([^"]+)"/i)?.[1] ||
    task.match(/\b(?:named|called)\s+'([^']+)'/i)?.[1];

  if (quoted) {
    return quoted.trim();
  }

  const filename = normalizeWhitespace(task)
    .split(/\s+/)
    .map(cleanToken)
    .find(word => /^[^/\s]+\.[A-Za-z0-9._-]+$/.test(word));

  return filename || null;
}

function extractPackageName(task) {
  const patterns = [
    /\b(?:install|add|get)\s+(?:the\s+package\s+)?["']?([a-z0-9@+._-]+)["']?/i,
    /\b(?:remove|uninstall|delete)\s+(?:the\s+package\s+)?["']?([a-z0-9@+._-]+)["']?/i,
    /\b(?:search|find|look\s+for)\s+(?:the\s+package\s+)?["']?([a-z0-9@+._-]+)["']?/i
  ];

  for (const pattern of patterns) {
    const match = task.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function formatPackageName(packageName) {
  // Strip anything that isn't a valid package-name character to prevent injection
  return String(packageName || "")
    .trim()
    .replace(/[^a-zA-Z0-9@._+\-]/g, "");
}

function buildPackageActionCommand(systemProfile, action, packageName) {
  const profile = systemProfile || {};
  const packageManager = profile.packageManager || "generic-linux";
  const distroLabel = profile.prettyName || "this system";

  switch (action) {
    case "update":
      if (packageManager === "pacman") {
        return {
          command: "sudo pacman -Syu",
          explanation: `Synchronizes package databases and upgrades all installed packages on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: ["checkupdates"]
        };
      }

      if (packageManager === "apt") {
        return {
          command: "sudo apt update && sudo apt upgrade -y",
          explanation: `Refreshes package metadata and upgrades installed packages on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: ["sudo apt full-upgrade -y"]
        };
      }

      if (packageManager === "dnf") {
        return {
          command: "sudo dnf upgrade --refresh -y",
          explanation: `Refreshes repositories and upgrades installed packages on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: ["sudo dnf check-update"]
        };
      }

      if (packageManager === "zypper") {
        return {
          command: "sudo zypper refresh && sudo zypper update -y",
          explanation: `Refreshes repositories and updates installed packages on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: ["sudo zypper dup"]
        };
      }

      if (packageManager === "apk") {
        return {
          command: "sudo apk update && sudo apk upgrade",
          explanation: `Refreshes Alpine package indexes and upgrades installed packages.`,
          riskLevel: "medium",
          alternatives: []
        };
      }

      return null;

    case "install":
      if (!packageName) {
        return null;
      }

      packageName = formatPackageName(packageName);

      if (packageManager === "pacman") {
        return {
          command: `sudo pacman -S ${packageName}`,
          explanation: `Installs ${packageName} using pacman on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: [`pacman -Ss ${packageName}`]
        };
      }

      if (packageManager === "apt") {
        return {
          command: `sudo apt install -y ${packageName}`,
          explanation: `Installs ${packageName} using apt on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: [`apt search ${packageName}`]
        };
      }

      if (packageManager === "dnf") {
        return {
          command: `sudo dnf install -y ${packageName}`,
          explanation: `Installs ${packageName} using dnf on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: [`dnf search ${packageName}`]
        };
      }

      if (packageManager === "zypper") {
        return {
          command: `sudo zypper install -y ${packageName}`,
          explanation: `Installs ${packageName} using zypper on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: [`zypper search ${packageName}`]
        };
      }

      if (packageManager === "apk") {
        return {
          command: `sudo apk add ${packageName}`,
          explanation: `Installs ${packageName} using apk on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: [`apk search ${packageName}`]
        };
      }

      return null;

    case "remove":
      if (!packageName) {
        return null;
      }

      packageName = formatPackageName(packageName);

      if (packageManager === "pacman") {
        return {
          command: `sudo pacman -Rns ${packageName}`,
          explanation: `Removes ${packageName} and unused dependencies with pacman on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: [`pacman -Qi ${packageName}`]
        };
      }

      if (packageManager === "apt") {
        return {
          command: `sudo apt remove -y ${packageName}`,
          explanation: `Removes ${packageName} using apt on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: [`sudo apt purge -y ${packageName}`]
        };
      }

      if (packageManager === "dnf") {
        return {
          command: `sudo dnf remove -y ${packageName}`,
          explanation: `Removes ${packageName} using dnf on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: []
        };
      }

      if (packageManager === "zypper") {
        return {
          command: `sudo zypper remove -y ${packageName}`,
          explanation: `Removes ${packageName} using zypper on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: []
        };
      }

      if (packageManager === "apk") {
        return {
          command: `sudo apk del ${packageName}`,
          explanation: `Removes ${packageName} using apk on ${distroLabel}.`,
          riskLevel: "medium",
          alternatives: []
        };
      }

      return null;

    case "search":
      if (!packageName) {
        return null;
      }

      packageName = formatPackageName(packageName);

      if (packageManager === "pacman") {
        return {
          command: `pacman -Ss ${packageName}`,
          explanation: `Searches Arch repositories for packages matching ${packageName}.`,
          riskLevel: "low",
          alternatives: [`pacman -Si ${packageName}`]
        };
      }

      if (packageManager === "apt") {
        return {
          command: `apt search ${packageName}`,
          explanation: `Searches apt repositories for packages matching ${packageName}.`,
          riskLevel: "low",
          alternatives: [`apt show ${packageName}`]
        };
      }

      if (packageManager === "dnf") {
        return {
          command: `dnf search ${packageName}`,
          explanation: `Searches dnf repositories for packages matching ${packageName}.`,
          riskLevel: "low",
          alternatives: [`dnf info ${packageName}`]
        };
      }

      if (packageManager === "zypper") {
        return {
          command: `zypper search ${packageName}`,
          explanation: `Searches zypper repositories for packages matching ${packageName}.`,
          riskLevel: "low",
          alternatives: []
        };
      }

      if (packageManager === "apk") {
        return {
          command: `apk search ${packageName}`,
          explanation: `Searches Alpine repositories for packages matching ${packageName}.`,
          riskLevel: "low",
          alternatives: []
        };
      }

      return null;

    default:
      return null;
  }
}

function buildCreateFileCommand(filePath) {
  const directory = path.posix.dirname(filePath);
  const privileged = isProtectedPath(filePath);

  if (privileged) {
    return {
      command: `sudo mkdir -p ${shellQuote(directory)} && sudo touch ${shellQuote(filePath)}`,
      explanation: `Creates ${filePath} using administrator privileges because the path is system-owned.`,
      riskLevel: "medium",
      alternatives: [`sudo install -D /dev/null ${shellQuote(filePath)}`]
    };
  }

  return {
    command: `mkdir -p ${shellQuote(directory)} && touch ${shellQuote(filePath)}`,
    explanation: `Creates the file ${filePath} and makes sure the parent directory already exists.`,
    riskLevel: "low",
    alternatives: []
  };
}

function buildWriteFileCommand(filePath, content) {
  const directory = path.posix.dirname(filePath);
  const quotedPath = shellQuote(filePath);
  const quotedContent = shellQuote(content);

  if (isProtectedPath(filePath)) {
    return {
      command: `sudo mkdir -p ${shellQuote(directory)} && printf '%s\\n' ${quotedContent} | sudo tee ${quotedPath} >/dev/null`,
      explanation: `Creates or overwrites ${filePath} with the provided content using sudo and tee so the privileged write actually succeeds.`,
      riskLevel: "medium",
      alternatives: [`printf '%s\\n' ${quotedContent} | sudo tee -a ${quotedPath} >/dev/null`]
    };
  }

  return {
    command: `mkdir -p ${shellQuote(directory)} && printf '%s\\n' ${quotedContent} > ${quotedPath}`,
    explanation: `Creates or overwrites ${filePath} with the provided content after ensuring the parent directory exists.`,
    riskLevel: "low",
    alternatives: [`mkdir -p ${shellQuote(directory)} && tee ${quotedPath} >/dev/null <<'EOF'\n${content}\nEOF`]
  };
}

function buildCreateDirectoryCommand(targetDirectory) {
  if (isProtectedPath(targetDirectory)) {
    return {
      command: `sudo mkdir -p ${shellQuote(targetDirectory)}`,
      explanation: `Creates ${targetDirectory} with administrator privileges because it is under a protected system path.`,
      riskLevel: "medium",
      alternatives: []
    };
  }

  return {
    command: `mkdir -p ${shellQuote(targetDirectory)}`,
    explanation: `Creates ${targetDirectory} and any missing parent directories.`,
    riskLevel: "low",
    alternatives: []
  };
}

function buildFindFileCommand(filename, searchRoot) {
  const safeRoot = searchRoot || "/";
  const riskLevel = safeRoot === "/" ? "medium" : "low";

  return {
    command: `find ${shellQuote(safeRoot)} -type f -name ${shellQuote(filename)} 2>/dev/null`,
    explanation: `Searches ${safeRoot} for a file named ${filename} while hiding permission-noise from protected directories.`,
    riskLevel,
    alternatives:
      safeRoot === "/"
        ? [`sudo find / -type f -name ${shellQuote(filename)}`]
        : []
  };
}

function buildFindLargeFilesCommand(searchRoot, sizeThreshold = "100M") {
  return {
    command: `find ${shellQuote(searchRoot || "/")} -type f -size +${sizeThreshold} -print 2>/dev/null | sort`,
    explanation: `Searches for files larger than ${sizeThreshold} and hides permission-denied noise from protected directories.`,
    riskLevel: searchRoot === "/" || !searchRoot ? "medium" : "low",
    alternatives: []
  };
}

function extractSizeThreshold(task) {
  const match = task.match(/(\d+)\s*(kb|mb|gb|tb|k|m|g|t)\b/i);

  if (!match) {
    return "100M";
  }

  const unit = match[2].toLowerCase();
  const normalized =
    unit === "kb" || unit === "k"
      ? "k"
      : unit === "mb" || unit === "m"
      ? "M"
      : unit === "gb" || unit === "g"
      ? "G"
      : unit === "tb" || unit === "t"
      ? "T"
      : "M";

  return `${match[1]}${normalized}`;
}

function sanitizeGeneratedResult(parsed) {
  const command = sanitizeCommand(parsed.command);
  const alternatives = sanitizeAlternatives(parsed.alternatives);
  const riskLevel = detectRiskLevel(command, parsed.riskLevel);

  return {
    ...parsed,
    command,
    alternatives,
    riskLevel
  };
}

function maybeRewritePrivilegedRedirection(command) {
  const sanitized = sanitizeCommand(command);
  const match = sanitized.match(
    /^(sudo\s+)?(echo\s+.+?|printf\s+.+?)\s*>\s*(["']?)(\/[^\s"'`]+)\3$/i
  );

  if (!match) {
    return sanitized;
  }

  const [, sudoPrefix = "", producer, , targetPath] = match;

  if (!sudoPrefix && !isProtectedPath(targetPath)) {
    return sanitized;
  }

  return `${producer} | sudo tee ${shellQuote(targetPath)} >/dev/null`;
}

function applyInstructionHeuristics(instruction, parsed, systemProfile = {}) {
  const task = normalizeWhitespace(instruction);
  const lower = task.toLowerCase();
  const explicitFilePath = extractPathAndFile(task);
  const explicitContent = extractContentText(task);
  const packageName = extractPackageName(task);

  if (
    /\b(update|upgrade)\b/i.test(lower) &&
    /\b(system|packages?|machine|os)\b/i.test(lower)
  ) {
    const packageAction = buildPackageActionCommand(systemProfile, "update");

    if (packageAction) {
      return packageAction;
    }
  }

  if (/\b(install|add|get)\b/i.test(lower) && packageName) {
    const packageAction = buildPackageActionCommand(
      systemProfile,
      "install",
      packageName
    );

    if (packageAction) {
      return packageAction;
    }
  }

  if (/\b(remove|uninstall|delete)\b/i.test(lower) && packageName) {
    const packageAction = buildPackageActionCommand(
      systemProfile,
      "remove",
      packageName
    );

    if (packageAction) {
      return packageAction;
    }
  }

  if (/\b(search|find|look\s+for)\b/i.test(lower) && /\bpackage\b/i.test(lower) && packageName) {
    const packageAction = buildPackageActionCommand(
      systemProfile,
      "search",
      packageName
    );

    if (packageAction) {
      return packageAction;
    }
  }

  if (
    explicitFilePath &&
    explicitContent &&
    /\b(create|make|write|put|enter|insert|save)\b/i.test(lower) &&
    /\bfile\b/i.test(lower)
  ) {
    return buildWriteFileCommand(explicitFilePath, explicitContent);
  }

  if (
    explicitFilePath &&
    /\b(create|make)\b/i.test(lower) &&
    /\bfile\b/i.test(lower)
  ) {
    return buildCreateFileCommand(explicitFilePath);
  }

  const directoryTarget = extractDirectoryTarget(task);

  if (
    directoryTarget &&
    /\b(create|make)\b/i.test(lower) &&
    /\b(folder|directory)\b/i.test(lower)
  ) {
    return buildCreateDirectoryCommand(directoryTarget);
  }

  const findTarget = extractFindTarget(task);

  if (findTarget && /\b(find|locate|where)\b/i.test(lower)) {
    const searchRoot = extractDirectoryTarget(task) || "/";
    return buildFindFileCommand(findTarget, searchRoot);
  }

  if (
    /\b(hidden files?\b|\bshow\b.*\bhidden\b|\blist\b.*\bhidden\b)/i.test(lower)
  ) {
    return {
      command: "ls -la",
      explanation: "Lists all files in the current directory, including hidden entries.",
      riskLevel: "low",
      alternatives: ["find . -maxdepth 1 -printf '%P\\n'"]
    };
  }

  if ((lower.includes("large") || lower.includes("big")) && lower.includes("file")) {
    return buildFindLargeFilesCommand(
      extractDirectoryTarget(task) || "/",
      extractSizeThreshold(task)
    );
  }

  const sanitized = sanitizeGeneratedResult(parsed);
  const rewrittenCommand = maybeRewritePrivilegedRedirection(sanitized.command);

  return {
    ...sanitized,
    command: rewrittenCommand,
    riskLevel: detectRiskLevel(rewrittenCommand, sanitized.riskLevel)
  };
}

module.exports = {
  applyInstructionHeuristics,
  detectRiskLevel,
  isProtectedPath,
  sanitizeCommand,
  sanitizeGeneratedResult,
  shellQuote
};
