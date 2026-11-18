# Installing the MCP servers on a new machine

This installs the full MCP server collection: the custom servers in this repo's [`mcp-servers/`](../mcp-servers) folder plus tools vendored from their own upstream GitHub repos (graphify, mcp-chrome, notebooklm-mcp-cli, remotion-media-mcp).

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | v20+ | https://nodejs.org/ |
| **npm** | bundled with Node.js | |
| **git** | any recent version | |
| **OpenCode** | latest | `npm install -g opencode-ai` |
| **Docker** (optional) | latest | for SearXNG and Docker-based scans |
| **Trivy / Gitleaks / pip-audit** (optional) | latest | for `security-mcp`'s dependency/secret scans |
| **pnpm** (optional) | latest | only needed to build `mcp-chrome` |

## Quick install

```bash
git clone https://github.com/aideveloper1976-arch/agentic-sdlc.git
cd agentic-sdlc/installer
./scripts/install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/aideveloper1976-arch/agentic-sdlc.git
cd agentic-sdlc\installer
.\scripts\install.ps1
```

The installer:

1. Checks prerequisites (Node 20+, npm, git; warns on missing optional tools).
2. Clones this repo once and copies each custom server's folder into place.
3. Clones/updates the upstream tools (graphify, notebooklm-mcp-cli, remotion-media-mcp) directly from their own GitHub repos. `mcp-chrome` is optional (see below).
4. Runs `npm install` + build for every tool, plus any tool-specific post-install step (Playwright browser install, traceability DB init).
5. Prompts you for every required secret/setting (masked input for tokens) and writes `.env` — or reads them non-interactively from a file you supply.
6. Generates MCP server configuration for **Claude Code, OpenCode, VS Code, and Zed** — all four by default — wiring every built tool into each client.

## Which clients get configured

By default the installer writes config for all four supported clients:

| Client | File | Format |
|---|---|---|
| Claude Code | `.mcp.json` | `mcpServers.<key> = { command, args, env }` |
| OpenCode | `opencode.json` | `mcp.<key> = { type: "local", command, environment, enabled }` |
| VS Code | `.vscode/mcp.json` | `servers.<key> = { type: "stdio", command, args, env }` |
| Zed | `.zed/settings.json` (merged) | `context_servers.<key> = { source: "custom", command, args, env }` |

Limit it to a subset with `--clients`/`-Clients`:

```bash
./scripts/install.sh --clients opencode,vscode
```

```powershell
.\scripts\install.ps1 -Clients opencode,vscode
```

**These generated files contain literal credential values copied from `.env`, not references to it** — none of the four client formats reliably support reading an external `.env` at server-spawn time across versions, so the installer embeds the real values directly to guarantee servers actually start. `.mcp.json` and `.vscode/mcp.json` are gitignored automatically by the manifest's `.gitignore`. `.zed/settings.json` is merged into your existing file (or left untouched with a `context_servers.mcp-snippet.json` sidecar written instead, if your existing settings use JSONC comments that break strict JSON parsing) — since that file commonly holds legitimate shareable project settings too, it is **not** auto-gitignored, so review its diff before committing after running the installer. Re-running the installer re-syncs all four from the latest `.env` and manifest — safe to do any time you rotate a credential.

You can regenerate just the client configs without reinstalling anything, any time `.env` changes:

```bash
node scripts/generate-configs.js --manifest tools.manifest.json --env .env --target . --clients claude,opencode,vscode,zed
```

## Providing secrets non-interactively

```bash
# creds.env: one VAR=value per line, same names install.sh would prompt for
./scripts/install.sh --secrets-file creds.env --non-interactive
```

```powershell
.\scripts\install.ps1 -SecretsFile creds.env -NonInteractive
```

Never commit `creds.env` or `.env` — both are gitignored. See `tools.manifest.json` for the full list of variables each tool reads, or run the installer interactively once to see the prompts.

## Installing a subset

```bash
./scripts/install.sh --only traceability-mcp,github-mcp,security-mcp
```

## Including optional tools

`graphify`, `mcp-chrome`, `notebooklm-mcp-cli`, and `remotion-media-mcp` are marked optional in `tools.manifest.json` (not everyone needs a Chrome extension bridge or video generation). Include them with:

```bash
./scripts/install.sh --with-optional
```

## Installing to a different directory

```bash
./scripts/install.sh --target-dir /opt/agentic-sdlc-tools
```

## After install

```bash
cd installer   # or your --target-dir
opencode mcp list       # confirm every server is registered and connects
opencode mcp debug atlassian_custom   # debug a specific server if it fails to connect
opencode
```

For the other clients: Claude Code picks up `.mcp.json` automatically when you run `claude` from this directory (`claude mcp list` to verify); VS Code picks up `.vscode/mcp.json` automatically for that workspace (check the MCP Servers view); Zed reads `context_servers` from `.zed/settings.json` on next launch (check the agent panel's server list).

If `security-mcp` reports missing `trivy`/`gitleaks`/`pip-audit`, those scans are skipped gracefully — install them separately if you need that coverage.

## Re-running the installer

Re-running `install.sh`/`install.ps1` is safe: upstream tools are `git pull`'d instead of re-cloned, custom tools are re-copied from the latest commit of this repo, and an existing `.env` is left untouched (delete it first if you want to be re-prompted).

## What each tool does

See [docs/mcp-servers.md](../docs/mcp-servers.md) for an overview, the [tool catalogue](../docs/tool-catalog.md) for every tool, and each server's own `README.md` for environment variables and examples.
