# Getting started

## 1. Build and check the repo

Requirements: Node.js 22 or newer, git. Optional: Docker (SearXNG, Docker scans), Trivy and
gitleaks (security scans), Ollama (local models), Playwright browsers (browser-driven servers).

```bash
git clone https://github.com/aideveloper1976-arch/agentic-sdlc.git
cd agentic-sdlc
npm ci
npm run build
npm run check
npm run smoke
```

For the browser-driven servers, install Chromium once: `npx playwright install chromium`.

## 2. Add the framework to a project

```bash
cp -r framework/.opencode framework/AGENTS.md /path/to/your-project/
cp framework/opencode.example.json /path/to/your-project/opencode.json
```

Then edit `opencode.json`:

1. **Models.** List the models you can use under `provider`. The router picks from these; see
   [model-routing.md](model-routing.md).
2. **MCP server paths.** Point each `command` at this repo's built servers, for example
   `["node", "/abs/path/agentic-sdlc/mcp-servers/security-mcp/dist/index.js"]`.
3. **Secrets.** Values like `{env:GITHUB_TOKEN}` are read from your environment. Nothing secret
   goes in the file.
4. **Optional integrations.** Jira and Confluence sync are off by default
   (`JIRA_ENABLED=false`); enable them and set the Atlassian variables when you want them.

Start OpenCode in the project and run `/show-routing` to confirm the plugin loaded, then
`/run-full-sdlc "<feature>"`.

## 3. Or install the servers for every client

The installer clones this repo, builds each server, asks for the settings each one needs
(masked input for tokens), and writes MCP config for Claude Code, OpenCode, VS Code and Zed.

```bash
cd installer
./scripts/install.sh            # macOS, Linux, Git Bash
.\scripts\install.ps1           # Windows PowerShell
```

See [installer/INSTALL.md](../installer/INSTALL.md) for client selection, subsets and
non-interactive installs.

## 4. Try one server on its own

```bash
npx @modelcontextprotocol/inspector node mcp-servers/ux-intelligence-mcp/dist/index.js
```

Call `ux_check_accessibility` with `#777777` on `#FFFFFF` to see a WCAG result, or
`ux_generate_design_system` with a product type such as `"analytics dashboard"`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/show-routing` unknown, no routing table in the first message | plugin didn't load | check OpenCode's log for "failed to load plugin"; the plugin needs `@opencode-ai/plugin` (installed from `.opencode/package.json`) |
| Every agent on the same model | only one model configured, or every agent pinned | add more models under `provider`, or remove `model:` pins from agent files |
| An agent's pinned model is ignored | the pinned model isn't configured | add it under `provider.<id>.models` |
| MCP tools missing in the client | server not built or wrong path | `npm run build`, then check the `command` path |
| Browser tools fail to launch | Chromium not installed | `npx playwright install chromium` |
| Long runs lose context | session too large | use `/continue-sdlc <phase>` in a new session; runs resume from checkpoints |
