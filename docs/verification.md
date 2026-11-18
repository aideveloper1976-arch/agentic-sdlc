# Verification status

What has been checked, how, and what hasn't. Kept deliberately plain so readers can tell
working features from aspirations.

## Automated (runs in CI on every push)

| Area | Check | Count |
|---|---|---|
| Build | `tsc` in strict mode for all 13 packages | 13 packages |
| Types | `npm run typecheck` | 13 packages |
| Server logic | unit tests (`node:test` via `tsx`) | 30 tests in 6 servers |
| Framework | router, profiler, agent-factory and end-to-end routing tests through the plugin hooks | 19 tests |
| MCP protocol | `npm run smoke` boots each server over stdio, performs `initialize` and `tools/list` | 12 servers, 133 tools |
| Installer | bash syntax check, JS syntax check, manifest and example config parse | 4 checks |
| Secrets | gitleaks on full history | every push |
| Static analysis | CodeQL (JavaScript/TypeScript) | every push + weekly |

### Unit-test coverage by server

| Server | Unit tests | What they cover |
|---|---|---|
| ux-intelligence-mcp | 8 | WCAG contrast maths, BM25 ranking, filtering |
| test-automation-mcp | 9 | UAT config, expectation assertions, tool input schema |
| code-execution-mcp | 5 | command and subcommand allowlist, path-execution block |
| traceability-mcp | 4 | gap detection across story → feature → epic → research |
| security-mcp | 2 | secret detection on a fixture, clean project |
| document-intake-mcp | 2 | CSV and Markdown parsing |
| github, atlassian, monitoring, ux-hci, browser-research, web-downloader | 0 | smoke test only |

## Manually verified

| What | How | Result |
|---|---|---|
| Plugin loads and routes models in a real OpenCode session | OpenCode 1.19.6, providers pointed at a stub server that logged each request's `model` | orchestrator → Opus, architect → Sonnet, story-writer → local Llama 8B. See [model-routing.md](model-routing.md) |
| Repository contains no secrets | the repo's own `security-mcp` secret scanner run against the tree, plus pattern search for common key formats | only placeholders and false positives (Google Fonts URLs) |
| Framework used on a production codebase | 18 `/run-full-sdlc` and `/fix-issue` runs on a B2B SaaS platform | see the [case study](case-studies/observability-run.md) |

## Not verified

- Calls to real hosted model APIs from this repo's test setup (no API keys in CI).
- Orchestrator → subagent hand-off in a live session (agents were run individually).
- The servers that call external services (GitHub, Jira, Confluence, SearXNG) against live
  endpoints from CI.
- `lib/agent-factory.js` in a live session: it is tested as a library but no hook or command
  calls it yet.

## Reproduce

```bash
npm ci
npm run build
npm run check    # typecheck + 30 server tests + 19 framework tests
npm run smoke    # 12 servers, 133 tools
```
