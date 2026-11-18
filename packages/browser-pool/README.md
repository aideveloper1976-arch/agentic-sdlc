# Browser pool

> One shared headless Chromium process with isolated, labelled browser contexts for Playwright-based tools.

| | |
|---|---|
| Package | `@agentic-sdlc/browser-pool` |
| Type | Library (not an MCP server) |
| Entry point | `src/browser-pool.ts`, exports `BrowserPool` |
| Dependencies | `playwright` |

## Why

Browser-driven tools are slow to start and memory-hungry when each one launches its own
Chromium. `BrowserPool` is a process-wide singleton that launches Chromium once and hands out
an isolated context and page per label, so callers share the browser without sharing state.

## Status

The browser-driven servers in this repo (`browser-research-mcp`, `test-automation-mcp`,
`ux-hci-mcp`) still manage their own Playwright instances. Moving them onto this pool is a
planned refactor.

## Usage

```ts
import { BrowserPool } from "@agentic-sdlc/browser-pool";

const pool = BrowserPool.getInstance({ headless: true, viewport: { width: 1280, height: 720 } });
const { page } = await pool.acquire("homepage-check");
try {
  await page.goto("https://example.com");
} finally {
  await pool.release("homepage-check");
}
await pool.shutdown(); // on process exit
```

Build with the rest of the repo: `npm ci && npm run build` from the root.
