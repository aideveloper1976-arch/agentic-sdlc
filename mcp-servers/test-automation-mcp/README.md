# Test Automation MCP Server

An MCP server for automated end-to-end browser testing, visual regression detection, accessibility auditing, and UX flow validation.

## Features

- **Run E2E Tests** — Execute multi-step browser tests with assertions
- **Capture Screenshots** — Full-page screenshots for evidence
- **Visual Regression** — Pixel-level comparison against baselines
- **UI Analysis** — Extract and inspect page structure
- **Accessibility Checks** — axe-core powered a11y audits
- **User Flow Testing** — Multi-step UX journeys with enriched evidence
- **Test Reports** — Aggregated markdown reports with screenshots and logs
- **Evidence Storage** — Structured traceability with entity linking

## Installation

```bash
cd test-automation-mcp
npm install
npx playwright install chromium
```

## Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost` | Default base URL for relative paths |
| `ALLOWED_DOMAINS` | *(empty)* | Comma-separated allowed domains (empty = localhost only) |
| `DEFAULT_TIMEOUT_MS` | `30000` | Default timeout for operations |
| `NAVIGATION_MAX_DEPTH` | `5` | Maximum navigation depth |
| `HEADLESS` | `true` | Run browser in headless mode |
| `SCREENSHOT_DIR` | `docs/product/evidence/tests` | Screenshot storage directory |
| `EVIDENCE_DIR` | `docs/product/evidence` | Evidence storage root |

## Usage

### Start the MCP server

```bash
npm start
# or
npm run dev
```

### Add to OpenCode

Add to your OpenCode MCP config file:

```json
{
  "mcpServers": {
    "test-automation": {
      "command": "node",
      "args": ["/path/to/test-automation-mcp/dist/index.js"],
      "env": {
        "BASE_URL": "http://localhost:3000",
        "HEADLESS": "true"
      }
    }
  }
}
```

## MCP Tools

### `run_e2e_test`

Execute a full end-to-end browser test.

**Input:**
- `url` — Page URL
- `testName` — Unique test identifier
- `steps` — Array of step objects:
  - `action`: `goto`, `click`, `type`, `wait`, `assert_text`, `assert_visible`
  - `selector`: CSS selector
  - `value`: Text value
  - `timeoutMs`: Step timeout

**Output:** Pass/fail status, per-step results, screenshots, logs, duration.

### `capture_screenshot`

Capture a full-page screenshot.

**Input:** `url`, `name`

### `run_visual_regression`

Compare a live page against a baseline image.

**Input:** `url`, `baselineImagePath`

**Output:** Diff percentage, diff image path, pass/fail.

### `analyze_ui`

Extract and analyze UI elements (buttons, forms, inputs, navigation).

**Input:** `url`

**Output:** Structured element lists, missing labels, inconsistencies.

### `check_accessibility`

Run axe-core accessibility audit.

**Input:** `url`

**Output:** Violations with severity, recommendations, pass/incomplete counts.

### `test_user_flow`

Execute a multi-step flow with evidence capture and markdown UX report.

**Input:** `url`, `flowName`, `steps` (same as `run_e2e_test`)

**Output:** Flow results, UX evidence files (JSON + markdown).

### `generate_test_report`

Aggregate all collected evidence into a markdown report.

**Input:** `testName`

**Output:** Aggregated report with pass rate, step details, screenshots.

### `save_test_evidence`

Save structured evidence linked to a traceability entity.

**Input:** `entityId`, `testName`, `result`, `evidencePaths`, `summary`

**Output:** Saved JSON + markdown evidence files.

## Safety Rules

- Only `localhost` is allowed by default
- External domains require explicit `ALLOWED_DOMAINS` configuration
- All operations are timed out
- No destructive actions (no delete, no form submission to production)
- Navigation depth is limited

## Output Format

All tool responses follow this structure:

```json
{
  "success": true,
  "testName": "my-test",
  "result": "passed",
  "steps": [...],
  "screenshots": ["...png"],
  "logs": ["..."],
  "durationMs": 1234
}
```

## Directory Structure

```
docs/product/evidence/
├── tests/          # Screenshots and test reports
├── ux/             # UX flow evidence (JSON + markdown)
└── visual/         # Visual regression diffs

test-automation-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── config.ts         # Configuration and URL validation
│   ├── playwright.ts     # Playwright browser management
│   ├── visual.ts         # Visual regression comparison
│   ├── accessibility.ts  # axe-core integration
│   ├── flows.ts          # User flow execution
│   ├── evidence.ts       # Evidence and report generation
│   └── types.ts          # Shared type definitions
├── package.json
├── tsconfig.json
└── .env.example
```
