# Browser Pool

Internal shared library — **not a standalone MCP server**. Provides a reusable pool of headless Chromium browser/context instances so `browser-research-mcp`, `test-automation-mcp`, and `ux-hci-mcp` don't each spin up their own browser process.

## What this is

- Runtime: Node.js + TypeScript
- Entry point: `src/browser-pool.ts` (exports `BrowserPool`)
- Consumed as a local dependency by other tools in this collection, not run directly

## Install and build

```bash
cd browser-pool
npm install
npm run build   # if a build script exists; otherwise consumed as TS source
```

## Usage (as a library)

```ts
import { BrowserPool } from "../browser-pool/src/browser-pool";

const pool = new BrowserPool({ maxInstances: 3, headless: true });
const page = await pool.acquire();
// ... use page ...
await pool.release(page);
```

## Notes

- No environment variables of its own — consuming tools (`browser-research-mcp`, `test-automation-mcp`, `ux-hci-mcp`) configure headless mode and timeouts via their own env vars, which they pass through to the pool.
- If you're looking for a directly-callable MCP server for browser automation, use `playwright-mcp` (general-purpose) or `test-automation-mcp` (E2E/UAT-focused) instead.
