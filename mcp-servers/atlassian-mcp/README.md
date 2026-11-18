# Atlassian MCP (Local) - Setup and Usage

This MCP server exposes custom Jira and Confluence tools over stdio for OpenCode.

## What this server is

- Runtime: Node.js + TypeScript
- Transport: stdio (`StdioServerTransport`)
- Entry point: `src/index.ts`
- Build output: `build/index.js`

## Prerequisites

- Node.js 18+
- Atlassian Cloud site URL (for example `https://your-site.atlassian.net`)
- Atlassian account email
- Atlassian API token

## Install and build

From this directory (`atlassian`):

```bash
npm ci
npm run build
```

## Required environment variables

The server exits on startup if any of these are missing:

- `ATLASSIAN_BASE_URL`
- `ATLASSIAN_EMAIL`
- `ATLASSIAN_API_TOKEN`

Example values:

```bash
ATLASSIAN_BASE_URL=https://your-site.atlassian.net
ATLASSIAN_EMAIL=you@example.com
ATLASSIAN_API_TOKEN=your_api_token
```

## OpenCode MCP config (local)

Add this to your project `opencode.json` under `mcp`:

```json
"atlassian_custom": {
  "type": "local",
  "command": ["node", "atlassian/build/index.js"],
  "environment": {
    "ATLASSIAN_BASE_URL": "https://your-site.atlassian.net",
    "ATLASSIAN_EMAIL": "you@example.com",
    "ATLASSIAN_API_TOKEN": "your_api_token"
  },
  "enabled": true,
  "timeout": 30000
}
```

Then verify:

```bash
opencode mcp list
opencode mcp debug atlassian_custom
```

## Run standalone (manual test)

```bash
ATLASSIAN_BASE_URL=https://your-site.atlassian.net \
ATLASSIAN_EMAIL=you@example.com \
ATLASSIAN_API_TOKEN=your_api_token \
node build/index.js
```

No output on startup is normal; it waits for MCP stdio requests.

## Available tools

Jira:

- `list_transitions`
- `transition_issue`
- `update_issue_field`
- `get_jira_issue`
- `search_jira_issues`
- `add_jira_comment`
- `create_jira_issue`
- `list_jira_projects`

Confluence:

- `list_confluence_spaces`
- `search_confluence_pages`
- `read_confluence_page`
- `create_confluence_page`
- `add_confluence_comment`
- `update_confluence_page`
- `upload_confluence_attachment`

## Notes and troubleshooting

- Set `ATLASSIAN_BASE_URL` to the site root, not `/wiki`; the server appends `/wiki` internally for Confluence APIs.
- If auth fails, verify email + token pair and that the token has required scopes/permissions.
- If `opencode mcp list` does not show connected, run `opencode mcp debug atlassian_custom`.
- Keep API tokens out of committed files when possible.
