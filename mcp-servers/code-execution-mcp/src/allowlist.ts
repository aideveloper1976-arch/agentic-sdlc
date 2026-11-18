const ALLOWED_COMMANDS = new Set([
  // npm
  "npm",
  // pnpm
  "pnpm",
  // yarn
  "yarn",
  // python testing
  "pytest",
  // go
  "go",
  // node
  "node",
  // git
  "git",
  // docker
  "docker",
  // docker compose
  "docker-compose",
]);

const BLOCKED_PATTERNS = [
  // Dangerous shell operations
  { cmd: "rm", args: ["-rf"], match: "exact", message: "rm -rf is blocked" },
  { cmd: "rm", args: ["-r", "-f"], match: "subset", message: "rm -rf is blocked" },
  { cmd: "rm", args: ["-fr"], match: "exact", message: "rm -rf is blocked" },
  { cmd: "sudo", message: "sudo is blocked" },
  { cmd: "chmod", message: "chmod is blocked" },
  { cmd: "chown", message: "chown is blocked" },
  { cmd: "mkfs", message: "mkfs is blocked" },
  { cmd: "dd", message: "dd is blocked" },
  { cmd: "wget", args: ["-O", "-"], match: "subset", message: "wget pipe execution is blocked" },
  { cmd: "curl", match: "any", message: "curl is blocked (use node fetch instead)" },
  { cmd: "bash", args: ["-c"], match: "subset", message: "inline bash execution is blocked" },
  { cmd: "sh", args: ["-c"], match: "subset", message: "inline shell execution is blocked" },
  { cmd: "eval", message: "eval is blocked" },
  { cmd: "kill", message: "kill is blocked" },
  { cmd: "pkill", message: "pkill is blocked" },
];

const ALLOWED_SUBCOMMANDS: Record<string, Set<string>> = {
  npm: new Set([
    "install", "ci", "test", "run", "build", "exec", "x",
    "ls", "list", "audit", "why",
  ]),
  pnpm: new Set([
    "install", "ci", "test", "run", "build", "exec", "dlx",
    "ls", "list", "audit", "why", "add", "remove", "update",
  ]),
  yarn: new Set([
    "install", "test", "run", "build", "add", "remove",
    "upgrade", "why", "dlx", "exec",
  ]),
  git: new Set([
    "status", "diff", "log", "show", "branch", "checkout",
    "add", "commit", "push", "pull", "fetch", "merge", "rebase",
    "stash", "tag", "describe", "rev-parse", "version", "init",
  ]),
  docker: new Set([
    "ps", "logs", "images", "info", "version",
    "compose", "context",
  ]),
  "docker-compose": new Set([
    "up", "down", "ps", "logs", "build", "pull",
    "restart", "stop", "start", "exec",
  ]),
  go: new Set([
    "test", "build", "run", "mod", "vet", "fmt", "version",
  ]),
  node: new Set([
    // any script
  ]),
  pytest: new Set([
    // any args
  ]),
};

const DOCKER_BLOCKED_ARGS = new Set([
  "system", "prune", "rmi", " rmi", "save", "load", "import", "export",
  "commit", "push", "login", "logout",
]);

export interface AllowlistResult {
  allowed: boolean;
  reason?: string;
}

export function validateCommand(command: string, args: string[]): AllowlistResult {
  const baseCmd = command.toLowerCase();

  // Check if base command is allowed
  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    if (baseCmd.includes("/") || baseCmd.includes("\\")) {
      return { allowed: false, reason: `Path-based execution is blocked: ${command}` };
    }
    return { allowed: false, reason: `Command not in allowlist: ${command}` };
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.cmd !== baseCmd) continue;

    if (!pattern.args) {
      return { allowed: false, reason: pattern.message };
    }

    if (pattern.match === "any") {
      return { allowed: false, reason: pattern.message };
    }

    if (pattern.match === "exact") {
      if (arraysMatch(args, pattern.args)) {
        return { allowed: false, reason: pattern.message };
      }
    }

    if (pattern.match === "subset") {
      if (arrayContains(args, pattern.args)) {
        return { allowed: false, reason: pattern.message };
      }
    }
  }

  // Check subcommand allowlist
  const allowedSubs = ALLOWED_SUBCOMMANDS[baseCmd];
  if (allowedSubs && allowedSubs.size > 0) {
    let firstArg = args[0]?.toLowerCase() || "";
    // Strip leading dashes for flags like --version => version
    if (firstArg.startsWith("--")) firstArg = firstArg.slice(2);
    if (firstArg && !allowedSubs.has(firstArg) && !isNodeScript(baseCmd, args)) {
      return {
        allowed: false,
        reason: `Subcommand '${firstArg}' not allowed for ${baseCmd}. Allowed: ${[...allowedSubs].join(", ")}`,
      };
    }
  }

  // Block dangerous docker operations
  if (baseCmd === "docker" || baseCmd === "docker-compose") {
    for (const arg of args) {
      if (DOCKER_BLOCKED_ARGS.has(arg.toLowerCase())) {
        return { allowed: false, reason: `Dangerous docker operation blocked: ${arg}` };
      }
    }

    // Block interactive exec
    if (baseCmd === "docker" && args[0] === "exec") {
      const hasItFlag = args.includes("-it") || args.includes("-i") || args.includes("-t");
      if (hasItFlag) {
        return { allowed: false, reason: "Interactive docker exec (-it) is blocked" };
      }
    }

    // Block arbitrary docker run
    if (baseCmd === "docker" && args[0] === "run") {
      return { allowed: false, reason: "docker run is blocked for security. Use docker compose instead." };
    }
  }

  return { allowed: true };
}

function arraysMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v.toLowerCase() === b[i].toLowerCase());
}

function arrayContains(haystack: string[], needle: string[]): boolean {
  const lowerHaystack = haystack.map((a) => a.toLowerCase());
  return needle.every((n) => lowerHaystack.includes(n.toLowerCase()));
}

function isNodeScript(cmd: string, args: string[]): boolean {
  if (cmd !== "node") return false;
  if (args.length === 0) return false;
  const first = args[0].toLowerCase();
  return !first.startsWith("-") && !first.startsWith("--");
}
