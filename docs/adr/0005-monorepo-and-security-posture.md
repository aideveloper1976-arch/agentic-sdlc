# 0005. Monorepo and security posture

## Status
Accepted

## Context
The servers share tooling, dependencies and conventions, and the framework executes commands on
a developer's machine with model-generated arguments.

## Decision
- One npm-workspaces monorepo: TypeScript strict mode in every package, one lockfile, one CI pipeline.
- No credentials anywhere in the repo. Configuration uses environment variables and
  `{env:VAR}` references; `.env` files are git-ignored.
- `code-execution-mcp` only runs allowlisted commands and subcommands, blocks path-based and
  destructive patterns, and confines work to a configured directory.
- Agent permissions default to `ask` for shell commands; generated agents inherit that.
- CI runs gitleaks and CodeQL; Dependabot keeps dependencies current.

## Consequences
- A single `npm ci && npm run build` sets everything up.
- Running a server needs its environment configured (see each `.env.example`).
