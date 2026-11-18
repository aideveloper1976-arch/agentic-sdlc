# MCP servers

Twelve TypeScript servers, **133 tools** in total. Every server speaks MCP over stdio, reads its
configuration from environment variables, and is booted and checked by `npm run smoke` in CI.
The full list of tools, as reported by each server's `tools/list`, is in the
[tool catalogue](tool-catalog.md).

## By role in the lifecycle

### Quality gates

| Server | Tools | Used in phases | What it does |
|---|---|---|---|
| [security-mcp](../mcp-servers/security-mcp) | 8 | 14 Security | Dependency audit (npm, pip-audit, Trivy), secret detection (gitleaks + built-in patterns), code and auth-flow checks, API security, container scan, consolidated report |
| [test-automation-mcp](../mcp-servers/test-automation-mcp) | 20 | 10, 11, 16 | Playwright E2E and user flows, scripted UAT sessions with evidence, visual regression (pixelmatch), axe accessibility, DOM snapshots, network and console inspection, trace recording |
| [ux-hci-mcp](../mcp-servers/ux-hci-mcp) | 9 | 12 UX/HCI | UI structure analysis, heuristic usability evaluation, user-flow and form analysis, accessibility, UX report |
| [ux-intelligence-mcp](../mcp-servers/ux-intelligence-mcp) | 10 | 5 UX design | Design-system generation and BM25 search over a curated data set (67 styles, 136 product types, 18 palettes, 19 font pairings, 99 guidelines, 30 anti-patterns, 14 stack guides); WCAG contrast |

### Knowledge and traceability

| Server | Tools | Used in phases | What it does |
|---|---|---|---|
| [traceability-mcp](../mcp-servers/traceability-mcp) | 11 | all, 15 | SQLite graph of entities, links and evidence; trace and gap reports; Jira and Confluence sync |
| [document-intake-mcp](../mcp-servers/document-intake-mcp) | 10 | 1–4 | PDF, DOCX, XLSX, CSV and Markdown parsing; requirement, table and evidence extraction; document comparison |
| [browser-research-mcp](../mcp-servers/browser-research-mcp) | 4 | 1–2 | SearXNG metasearch with DuckDuckGo fallback, Playwright page extraction, competitor scans, saved evidence |
| [web-downloader-mcp](../mcp-servers/web-downloader-mcp) | 4 | 1–2 | Domain-allowlisted downloads with size and extension limits, HTML extraction |

### Execution and delivery

| Server | Tools | Used in phases | What it does |
|---|---|---|---|
| [code-execution-mcp](../mcp-servers/code-execution-mcp) | 13 | 8–11 | Allowlisted command runner (tests, builds, installs), Docker Compose control, project diagnostics |
| [github-mcp](../mcp-servers/github-mcp) | 16 | 17 | Branches, commits, diffs, pull requests, issues, workflow runs; links PRs to stories |
| [atlassian-mcp](../mcp-servers/atlassian-mcp) | 15 | 4, 19 | Jira issues, transitions and comments; Confluence spaces, pages and attachments |
| [monitoring-mcp](../mcp-servers/monitoring-mcp) | 13 | 18 | Service and API health, Docker status, logs, metrics, anomaly detection, alerts |

[`packages/browser-pool`](../packages/browser-pool) is a reusable Chromium pool library. The
browser-driven servers currently manage their own Playwright instances; moving them onto the
shared pool is a planned refactor.

## Running and inspecting a server

```bash
npm ci && npm run build
node mcp-servers/ux-intelligence-mcp/dist/index.js                      # speaks MCP on stdio
npx @modelcontextprotocol/inspector node mcp-servers/ux-intelligence-mcp/dist/index.js
```

## Regenerating the catalogue

```bash
npm run docs:catalog     # boots every server and rewrites docs/tool-catalog.md
```
