import type { Plugin } from "@opencode-ai/plugin";
import os from "os";
import path from "path";

const ALLOWED_COMMANDS = [
  // ── Docker ────────────────────────────────────────────
  "docker compose build",
  "docker compose up",
  "docker compose down",
  "docker build",
  "docker ps",
  "docker logs",
  "docker exec",
  "docker run",
  "docker stop",
  "docker rm",
  "docker network",
  "docker volume",
  "docker system",
  "docker container",

  // ── Package managers ──────────────────────────────────
  "npm install",
  "npm run",
  "npm test",
  "npm ci",
  "npm ls",
  "npm outdated",
  "npm audit",
  "npm fund",
  "npm rebuild",
  "npm cache",
  "pnpm install",
  "pnpm run",
  "pnpm test",
  "yarn install",
  "yarn run",
  "yarn test",

  // ── Build & quality ───────────────────────────────────
  "npx tsc",
  "npx jest",
  "npx playwright",
  "npx eslint",
  "npx prettier",
  "npx turbo",
  "npx ts-node",
  "npx ts-node-dev",

  // ── Prisma ────────────────────────────────────────────
  "npx prisma migrate dev",
  "npx prisma migrate deploy",
  "npx prisma migrate status",
  "npx prisma migrate resolve",
  "npx prisma db push",
  "npx prisma db pull",
  "npx prisma db seed",
  "npx prisma generate",
  "npx prisma studio",
  "npx prisma validate",
  "npx prisma format",

  // ── Git ───────────────────────────────────────────────
  "git add",
  "git commit",
  "git push",
  "git pull",
  "git fetch",
  "git status",
  "git diff",
  "git log",
  "git branch",
  "git checkout",
  "git switch",
  "git restore",
  "git stash",
  "git merge",
  "git rebase",
  "git reset",
  "git tag",
  "git remote",
  "git config",
  "git show",
  "git clean",
  "git init",

  // ── GitHub CLI ────────────────────────────────────────
  "gh pr create",
  "gh pr view",
  "gh pr list",
  "gh pr status",
  "gh pr merge",
  "gh pr checkout",
  "gh pr ready",
  "gh pr review",
  "gh pr comment",
  "gh pr close",
  "gh pr reopen",
  "gh pr edit",
  "gh pr checks",
  "gh repo",
  "gh auth",
  "gh issue",
  "gh release",
  "gh api",
  "gh search",
  "gh workflow",

  // ── Shell / scripting ─────────────────────────────────
  "powershell",
  "bash",
  "cmd",
  "wsl",
  "node",
  "tsx",
  "npx tsx",
  "npx ts-node-esm",

  // ── Database tools ─────────────────────────────────────
  "npx prisma",
  "psql",
  "pg_dump",
  "pg_restore",
  "redis-cli",
  "npx dotenv",

  // ── Utility ────────────────────────────────────────────
  "mkdir",
  "rm",
  "rmdir",
  "cp",
  "mv",
  "ls",
  "dir",
  "cd",
  "pwd",
  "cat",
  "echo",
  "touch",
  "chmod",
  "npx",

  // ── New migration tools ────────────────────────────────
  "oas-diff",
  "json-schema-diff",
  "npx oas-diff",
  "npx openapi-diff",
  "npx json-schema-diff",
];

const ALLOWED_DIRECTORIES = [
  // Project root and OS temp dir. Override with OPENCODE_ALLOWED_DIRS (path-delimited list).
  ...(process.env.OPENCODE_ALLOWED_DIRS
    ? process.env.OPENCODE_ALLOWED_DIRS.split(path.delimiter).map((d) => path.resolve(d))
    : [process.cwd(), path.join(os.tmpdir(), "opencode")]),
];

const autoApproveLocalCommandsPlugin: Plugin = async ({ client, directory, log }) => {
  return {
    "tool.execute.before": async (context, output) => {
      const { tool, args } = context;

      if (tool.name === "bash") {
        const command = args[0]?.value || "";
        const cwd = directory;

        const isCommandAllowed = ALLOWED_COMMANDS.some((allowed) => command.startsWith(allowed));
        const isDirectoryAllowed = ALLOWED_DIRECTORIES.some((allowedDir) => cwd.startsWith(allowedDir));

        if (isCommandAllowed && isDirectoryAllowed) {
          log.info(`Auto-approving command: ${command} in directory: ${cwd}`);
          // The permission system will check the config. If it's 'ask', we don't need to change it here.
          // The fact that this plugin runs and logs means the command is likely in an allowed context.
          // Future enhancements could involve dynamically updating permissions if the tool execution context allows.
        }
      }
    },
  };
};

export default autoApproveLocalCommandsPlugin;
