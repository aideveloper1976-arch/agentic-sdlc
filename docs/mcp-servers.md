# MCP servers

All servers are TypeScript, use `@modelcontextprotocol/sdk` over stdio, validate inputs with
zod, and read configuration from environment variables (see each folder's `.env.example`).

| Server | What it gives agents | Notable tools |
|---|---|---|
| [`traceability-mcp`](../mcp-servers/traceability-mcp) | A SQLite graph of research → EPIC → feature → story → code → test → release, with Jira/Confluence sync | create/link entities, record evidence, trace, gap report |
| [`security-mcp`](../mcp-servers/security-mcp) | SAST, dependency audit (npm, pip-audit, Trivy), secret detection (gitleaks + 25 patterns), API/auth checks | scan secrets, scan dependencies, security report |
| [`test-automation-mcp`](../mcp-servers/test-automation-mcp) | Playwright E2E flows, visual regression (pixelmatch), axe accessibility audits, scripted UAT sessions with evidence capture | run flow, visual diff, a11y audit, UAT session |
| [`ux-hci-mcp`](../mcp-servers/ux-hci-mcp) | Heuristic usability review, form and flow analysis, accessibility checks on a live page | heuristic review, flow analysis |
| [`ux-intelligence-mcp`](../mcp-servers/ux-intelligence-mcp) | Design-system generation from a searchable data set (styles, palettes, typography, guidelines, anti-patterns, stack guides) using BM25 ranking; WCAG contrast checks | generate design system, get palette, check contrast |
| [`browser-research-mcp`](../mcp-servers/browser-research-mcp) | Web search via SearXNG (DuckDuckGo fallback) and page extraction with saved evidence | search, extract page |
| [`web-downloader-mcp`](../mcp-servers/web-downloader-mcp) | Domain-allowlisted downloads with size and extension limits | download, page info |
| [`document-intake-mcp`](../mcp-servers/document-intake-mcp) | Parses PDF, DOCX, XLSX, CSV, Markdown; extracts requirements, tables and evidence | parse, extract requirements |
| [`code-execution-mcp`](../mcp-servers/code-execution-mcp) | Allowlisted command runner for tests and builds, optional Docker sandbox | run command, project diagnostics |
| [`monitoring-mcp`](../mcp-servers/monitoring-mcp) | Service health, logs, metrics, alert rules and anomaly detection | health, metrics, anomalies |
| [`github-mcp`](../mcp-servers/github-mcp) | PRs, branches, checks, workflows, issues, diffs | create PR, get checks, get diff |
| [`atlassian-mcp`](../mcp-servers/atlassian-mcp) | Jira and Confluence REST integration (optional) | issues, pages |

[`packages/browser-pool`](../packages/browser-pool) is a shared Chromium pool used by the
browser-driven servers.

## Running one server on its own

```bash
npm ci && npm run build
node mcp-servers/ux-intelligence-mcp/dist/index.js   # speaks MCP on stdio
```

Or inspect it interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node mcp-servers/ux-intelligence-mcp/dist/index.js
```
