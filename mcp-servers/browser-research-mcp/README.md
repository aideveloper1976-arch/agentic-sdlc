# Browser Research MCP Server

An MCP (Model Context Protocol) server that provides safe, compliant browser/web research tools for OpenCode agent swarms. Supports search via SearXNG, page extraction via Playwright, and evidence storage as markdown + JSON.

## Tools

| Tool | Description |
|---|---|
| `search_web` | Search the web using SearXNG (preferred) or browser-based search |
| `extract_page` | Open a URL with Playwright Chromium, extract readable text |
| `save_evidence` | Save extracted evidence to disk as JSON + Markdown |
| `competitor_scan` | Search for competitors related to a product idea |

## Install

```bash
cd browser-research-mcp
npm install
npx playwright install chromium
```

## Run SearXNG (Docker)

SearXNG runs on the shared Docker server (`dockerserver`). To deploy:

```bash
docker run -d --name searxng \
  -p 10808:8080 \
  -e BASE_URL=http://dockerserver:10808 \
  searxng/searxng
```

Access at http://dockerserver:10808. The JSON API is at `/search?format=json`.

## Build

```bash
npm run build
```

## Run

```bash
npm start
```

The server communicates over stdio (MCP protocol).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SEARXNG_URL` | `http://localhost:8080` | Primary SearXNG instance URL |
| `SEARXNG_BACKUP_URL` | `` (empty) | Backup SearXNG instance URL (used if primary fails) |
| `BROWSER_HEADLESS` | `true` | Run Playwright headless |
| `EVIDENCE_DIR` | `docs/product/evidence` | Evidence output directory |
| `BROWSER_TIMEOUT_MS` | `30000` | Page load timeout in ms |

Copy `.env.example` to `.env` to customize.

## OpenCode Configuration

Add to your OpenCode config:

```json
{
  "mcp": {
    "browser_research": {
      "type": "local",
      "command": ["node", "./browser-research-mcp/dist/index.js"],
      "env": {
        "SEARXNG_URL": "http://dockerserver:10808",
        "BROWSER_HEADLESS": "true",
        "EVIDENCE_DIR": "docs/product/evidence"
      },
      "enabled": true
    }
  }
}
```

## Compliance Rules

- Do not bypass CAPTCHAs or bot protection
- Do not scrape behind login pages
- Do not scrape paywalled or private pages
- Do not use stealth plugins or evasion techniques
- Respect robots.txt and rate limits where practical
- Conservative delays (1.5s) are added between browser actions
- Search snippets are NOT final evidence
- Agents must call `extract_page` before making source-backed claims

## Agent Usage (market-researcher)

```
You are a market researcher. When researching a topic:
1. Call `search_web` to find relevant pages
2. Call `extract_page` on each promising URL to verify content
3. Call `save_evidence` to persist findings as evidence
4. Use the evidence to write EPIC → Feature → Story documents in docs/product/
```

## Output Structure

```
docs/product/
  evidence/
    json/         # Structured evidence records (JSON)
    screenshots/  # Optional page screenshots (PNG)
    *.md          # Human-readable evidence notes
  market-research/
  competitor-analysis/
```

## Dependencies

- TypeScript
- @modelcontextprotocol/sdk
- Playwright
- Cheerio
- Zod
- dotenv
