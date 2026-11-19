# Contributing

Thanks for taking a look. Issues and pull requests are welcome.

## Set up

```bash
npm ci
npm run build
npm run check    # typecheck + unit tests + framework tests
npm run smoke    # boot every MCP server and list its tools
```

Node.js 22 or newer is required. Browser-driven servers need `npx playwright install chromium`.

## Making a change

1. Branch from `main`.
2. Write a failing test first where the change has logic (`test/*.test.ts` in the server, or
   `framework/test/*.test.mjs`). The framework practises TDD; so does this repo.
3. Keep tool inputs validated with zod and configuration in environment variables.
4. If you add, remove or rename a tool, run `npm run docs:catalog` and commit the updated
   [tool catalogue](docs/tool-catalog.md).
5. Update docs where behaviour changes, including [verification status](docs/verification.md)
   if you verify something new.
6. Open a pull request using the template. CI must be green.

## Adding an MCP server

- Create `mcp-servers/<name>-mcp/` with `src/index.ts`, `src/config.ts`, `test/`,
  `.env.example` and a README that starts with the standard header table used by the others.
- Name the package `@agentic-sdlc/<name>-mcp` and give it `build`, `typecheck` and `test` scripts.
- Add an entry to [`installer/tools.manifest.json`](installer/tools.manifest.json).
- The smoke test picks it up automatically.

## Adding an agent or skill

- Agents: a Markdown file in `framework/.opencode/agents/` with `mode`, `model_type`,
  `model_strength` and permissions (shell commands should default to `ask`).
- Skills: a folder with `SKILL.md` (frontmatter `name` and a "Use when…" `description`). See the
  `writing-skills` methodology skill.

## Never commit secrets

Use `.env` (git-ignored) and `{env:VAR}` references. CI runs gitleaks on every push.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
