# Traceability MCP server

> A SQLite traceability graph from research to EPIC, feature, story, code, test and release, with evidence records, gap detection and optional Jira/Confluence sync.

| | |
|---|---|
| Package | `@agentic-sdlc/traceability-mcp` |
| Tools | 11 ([full list](../../docs/tool-catalog.md#traceability-mcp)) |
| Transport | MCP over stdio |
| Key dependencies | `@modelcontextprotocol/sdk`, `better-sqlite3`, `zod` |
| Configuration | [`.env.example`](.env.example) |
| Tests | 4 unit tests in [`test/`](test), plus the [MCP smoke test](../../scripts/mcp-smoke.mjs) |

**Run it from the repo root**

```bash
npm ci && npm run build
node mcp-servers/traceability-mcp/dist/index.js
```

Part of [Agentic SDLC](../../README.md). The rest of this page is the server's detailed reference.

---

An MCP server for managing end-to-end delivery traceability across Idea → Research → EPIC → Feature → Story → Code → Test → UX Review → Security Review → Release.

Integrates with Jira and Confluence REST APIs with a local SQLite cache for fast lookup, offline resilience, and sync.

## Tools

| Tool | Description |
|---|---|
| `record_entity` | Create or update a local trace entity |
| `link_entities` | Link two entities with a typed relationship |
| `add_evidence` | Add evidence against an entity |
| `get_trace` | Return upstream/downstream trace with gap analysis |
| `generate_trace_report` | Generate audit-ready markdown/JSON report |
| `sync_from_jira` | Pull Jira issues into local cache |
| `sync_to_jira` | Push local entity updates to Jira |
| `sync_from_confluence` | Pull Confluence pages into local cache |
| `publish_trace_report_to_confluence` | Publish trace report as a Confluence page |
| `search_trace` | Search local cache for entities |
| `sync_all` | Run full Jira + Confluence sync |

## Entity Types

`idea`, `research`, `epic`, `feature`, `story`, `code_change`, `test_result`, `ux_review`, `security_review`, `release`, `decision`, `risk`, `dependency`

## Link Types

`derived_from`, `decomposes_to`, `implemented_by`, `validated_by`, `reviewed_by`, `secured_by`, `released_in`, `depends_on`, `mitigates`, `documents`, `relates_to`

## Install

```bash
cd traceability-mcp
npm install
npm run db:init
```

## Configure

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `ATLASSIAN_EMAIL` | Your Atlassian account email |
| `ATLASSIAN_API_TOKEN` | [Create an API token](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_BASE_URL` | e.g. `https://your-domain.atlassian.net` |
| `JIRA_PROJECT_KEY` | e.g. `ABC` |
| `CONFLUENCE_BASE_URL` | e.g. `https://your-domain.atlassian.net/wiki` |
| `CONFLUENCE_SPACE_KEY` | e.g. `PROD` |

## Build

```bash
npm run build
```

## Run

```bash
npm start
```

## Database

The SQLite database is created at the path specified by `TRACEABILITY_DB_PATH` (default: `.traceability/traceability.db`).

Re-initialise the schema:

```bash
npm run db:init
```

## Sync

```bash
npm run sync
```

Or trigger sync via the `sync_all` MCP tool.

## OpenCode Configuration

Add to your OpenCode config:

```json
{
  "mcp": {
    "traceability": {
      "type": "local",
      "command": ["node", "./traceability-mcp/dist/index.js"],
      "env": {
        "TRACEABILITY_DB_PATH": ".traceability/traceability.db",
        "ATLASSIAN_SITE_URL": "https://your-domain.atlassian.net",
        "ATLASSIAN_EMAIL": "your-email@example.com",
        "ATLASSIAN_API_TOKEN": "your-token",
        "JIRA_PROJECT_KEY": "ABC",
        "JIRA_BASE_URL": "https://your-domain.atlassian.net",
        "JIRA_ENABLED": "true",
        "CONFLUENCE_BASE_URL": "https://your-domain.atlassian.net/wiki",
        "CONFLUENCE_SPACE_KEY": "PROD",
        "CONFLUENCE_ENABLED": "true"
      },
      "enabled": true
    }
  }
}
```

## Agent Usage

### Market Researcher

```
1. Call record_entity to create a research entity
2. Link it to relevant ideas or epics via link_entities
3. Add evidence via add_evidence
```

### Story Writer / Product Analyst

```
1. Create EPIC → Feature → Story chain with record_entity + link_entities
2. Run generate_trace_report to check gaps before refinement
```

### Developer

```
1. Link code changes to stories via link_entities(type: "implemented_by")
2. Add test evidence via add_evidence(evidenceType: "test_result")
```

### UX Reviewer / Security Reviewer

```
1. Create review entities via record_entity
2. Link to stories via link_entities(type: "reviewed_by" | "secured_by")
3. Add evidence with findings
```

### Release Manager

```
1. Create release entity
2. Run generate_trace_report to check all gaps
3. Link downstream evidence before go-live
```

## Architecture Modes

### Mode 1: Direct REST (v1)
Uses Jira and Confluence REST APIs directly with configured Atlassian credentials.

### Mode 2: Atlassian MCP Bridge (future)
To use an existing Atlassian MCP server instead of direct REST, update the tool handlers in `index.ts` to call the external MCP tools via its stdio interface. The local SQLite cache remains the source of truth for fast lookups.

## Security Notes

- Never commit `ATLASSIAN_API_TOKEN` to version control
- Use `.env` file (gitignored) for all credentials
- API tokens are masked in error messages
- Local SQLite cache stores metadata only — no secrets
- `sync_to_jira` will NOT create issues unless `createIfMissing=true`
- Confluence publishing only updates pages created by this MCP unless `parentPageId` is specified
- All tool inputs are validated with Zod schemas
