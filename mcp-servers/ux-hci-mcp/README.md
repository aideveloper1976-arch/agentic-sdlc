# OpenCode UX/HCI MCP Server

A production-grade UX/HCI MCP server that enables AI agents to analyze user interfaces, evaluate usability, detect UX issues, validate interaction patterns, perform accessibility checks, and generate structured UX evidence.

## UX Principles Used

1. **Nielsen's 10 Usability Heuristics** — systematic evaluation against established HCI principles
2. **WCAG 2.2 AA** — accessibility checking via axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa)
3. **Hicks Law** — cognitive load estimation based on decision points
4. **Miller's Law** — navigation item count evaluation (7 ± 2)
5. **Fitts's Law** — interaction cost estimation (click count analysis)
6. **Progressive Disclosure** — friction detection in multi-step flows

## Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the MCP server
npm start

# Or run in development mode
npm run dev
```

> **Note:** `npm install` automatically runs `npx playwright install chromium` to download the browser binary. If it fails, run it manually:
> ```bash
> npx playwright install chromium
> ```

## Playwright Setup

The server uses Playwright's Chromium in headless mode. Configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `HEADLESS` | `true` | Run browser in headless mode |
| `ALLOWED_DOMAINS` | `localhost,127.0.0.1,*.local,*.test` | Comma-separated allowed URL patterns |
| `EVIDENCE_PATH` | `./docs/product/evidence` | Base path for reports and evidence |

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

## Example Usage

### Via MCP client (OpenCode)

```json
{
  "mcp": {
    "ux_hci": {
      "type": "local",
      "command": ["node", "./ux-hci-mcp/dist/index.js"],
      "enabled": true
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `analyze_ui_structure` | Extract headings, buttons, forms, inputs, navigation; detect missing labels, nesting issues |
| `evaluate_usability` | Score page 0-100 against Nielsen's 10 heuristics |
| `analyze_user_flow` | Map flow steps, decision points, friction areas, cognitive load |
| `detect_ux_issues` | Find broken flows, unclear CTAs, overloaded UI, poor feedback |
| `check_accessibility` | Run axe-core; return WCAG violations with severity and impacted elements |
| `capture_user_journey` | Execute multi-step flows with screenshot capture |
| `analyze_forms` | Check form fields for labels, validation, required indicators |
| `generate_ux_report` | Aggregate all findings into a structured markdown report |
| `save_ux_evidence` | Persist evidence JSON and markdown linked to traceability entities |

### Example Agent Workflow

```typescript
// 1. Analyze the UI
const structure = await mcp.call('analyze_ui_structure', { url: 'http://localhost:3000/login' });

// 2. Evaluate usability
const usability = await mcp.call('evaluate_usability', { url: 'http://localhost:3000/login' });

// 3. Check accessibility
const a11y = await mcp.call('check_accessibility', { url: 'http://localhost:3000/login' });

// 4. Generate report
const report = await mcp.call('generate_ux_report', { featureId: 'FTR-123', url: 'http://localhost:3000/login' });

// 5. Save evidence
await mcp.call('save_ux_evidence', {
  entityId: 'FTR-123',
  findings: { structure, usability, accessibility: a11y },
  severitySummary: { low: 2, medium: 3, high: 1, critical: 0 },
  reportPath: report.reportPath,
});
```

## OpenCode Integration

Add to `.opencode.json` or `opencode.json`:

```json
{
  "mcp": {
    "ux_hci": {
      "type": "local",
      "command": ["node", "./ux-hci-mcp/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Output Format

All tools return structured JSON:

```json
{
  "success": true,
  "analysisType": "usability",
  "overallScore": 72,
  "issues": [
    {
      "type": "navigation",
      "severity": "high",
      "description": "No back/undo/cancel controls detected",
      "recommendation": "Provide visible back buttons and undo options"
    }
  ]
}
```

Reports are saved as markdown to `docs/product/evidence/ux/<featureId>.md`.

## Architecture

```
src/
  index.ts         — MCP server, tool handlers, URL safety checks
  config.ts        — Environment configuration
  browser.ts       — Playwright browser lifecycle management
  types.ts         — All TypeScript types and interfaces
  ui.ts            — UI structure analysis (headings, forms, navigation)
  heuristics.ts    — Nielsen's 10 usability heuristics evaluation
  accessibility.ts — axe-core accessibility checks
  flows.ts         — User flow analysis, journey capture, form analysis
  issues.ts        — UX issue detection (broken flows, CTAs, patterns)
  report.ts        — Markdown report generation
  evidence.ts      — Evidence persistence (JSON + markdown)
```

## Limitations

- Read-only analysis only — no form submission or login flows
- URL safety checks restrict analysis to allowed domains (configurable via `ALLOWED_DOMAINS`)
- Heuristics are automated approximations — they complement but do not replace expert human review
- Accessibility checks use axe-core ruleset; manual testing is still required for complete WCAG coverage
- Screenshot storage can accumulate — clean `screenshots/` periodically
- Requires Playwright Chromium binary (~300MB)

## License

MIT — part of the OpenCode ecosystem.
