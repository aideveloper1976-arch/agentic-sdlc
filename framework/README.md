# Framework reference

This document describes the complete development methodology framework . It covers the plugin system, MCP servers, agents, skills, and commands that coordinate AI-assisted software development from idea to release.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Plugin System](#plugin-system)
- [MCP Servers](#mcp-servers)
- [Agents](#agents)
- [Project Skills](#project-skills)
- [Methodology Skills](#methodology-skills)
- [Commands](#commands)
- [Configuration](#configuration)
- [Workflow Examples](#workflow-examples)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
OpenCode Session
     │
     ├── opencode.json ─── Config (MCPs, agents, providers, permissions)
     │
     ├── Plugin ─── methodology-engine.js
     │     ├── Model auto-discovery (Ollama, OpenAI)
     │     ├── Capability-profiled routing table
     │     ├── Bootstrap injection (skill-first enforcement)
     │     ├── Session compaction hints
     │     └── Dynamic agent factory
     │
     ├── MCP Servers ─── 13 domain-specific tools
     │     ├── Traceability, Security, Testing, Browser Research
     │     ├── UX/HCI, UX Intelligence, Monitoring
     │     ├── Atlassian (Jira + Confluence), GitHub
     │     └── Code Execution, Web Downloader, Document Intake
     │
     ├── Agents ─── 15 specialized roles
     │     ├── Master orchestrator (primary)
     │     ├── 14 subagents (research, build, review, release)
     │     └── Dynamic agents (generated on demand)
     │
     ├── Skills ─── 26 knowledge modules
     │     ├── 14 methodology skills (portable, process-focused)
     │     └── 12 project skills (domain-specific)
     │
     └── Commands ─── 7 workflow triggers
           ├── /run-full-sdlc, /build-story, /fix-issue
           ├── /discover-and-write-backlog, /traceability-check
           ├── /continue-sdlc, /compact-session
```

---

## Plugin System

The `methodology-engine.js` plugin is auto-discovered by OpenCode from `.opencode/plugins/`. It hooks into the OpenCode lifecycle to provide:

### Auto-Trigger Bootstrap

On every session start, the plugin injects a bootstrap message into the first user message. This bootstrap tells the agent:

- Check for relevant skills BEFORE every action
- TDD strictness level (hardcore by default)
- Red flags that indicate rationalization
- Tool mapping for OpenCode equivalents
- Available methodology skills index

The bootstrap is cached after the first load and a **guard marker** (`EXTREMELY_IMPORTANT`) prevents double injection on subsequent message transforms.

### Model Discovery & Routing

The plugin probes Ollama (`/api/tags`) and OpenAI (`/v1/models`) APIs to discover available models, then classifies each into a capability tier:

| Tier | Label | Typical Models |
|------|-------|---------------|
| `reasoning` | Complex reasoning | gpt-5.x, o1, o3, claude, 70B+ local |
| `code-review` | Code review | gpt-4.x, 14B+ local |
| `code-capable` | Standard implementation | gpt-4-mini, mixtral, command-r |
| `fast-local` | Simple TDD tasks | llama3.1-8b, qwen2.5-7b |
| `fast` | Fast inference | Any local model, mini variants |

Classified models populate a **routing table**:
```
| Task Type               | Model Selected         |
|-------------------------|------------------------|
| Orchestrator            | gpt-5.5 (remote)       |
| Implementer (mechanical)| llama3.1:8b (local)    |
| Implementer (standard)  | gpt-4.1-mini (remote)  |
| Implementer (complex)   | qwen2.5:72b (local)    |
| Spec Reviewer           | llama3.1:8b (local)    |
| Quality Reviewer        | qwen2.5:14b (local)    |
```

The routing table is presented to the user for confirmation on first session (or when models change). A SHA-256 hash of the available model set prevents redundant confirmations.

### Session Compacting

The plugin registers critical context strings with OpenCode's compaction system, ensuring methodology rules, AGENTS.md references, and project structure are preserved when the session is compacted.

### Dynamic Agent Factory

When a task requires capabilities not covered by any predefined agent, the `AgentFactory` generates a temporary agent definition. Generated agents:
- Persist to `.opencode/agents/dynamic/` for cross-session reuse
- Use the same task description hash → same agent (avoid duplicates)
- Select the correct model tier from the routing table
- Include retry context when re-dispatched

### Configuration

The plugin reads `.opencode/plugins/methodology-config.json`:

```json
{
  "tdd": {
    "strictness": "hardcore",
    "overrides": { "allow-prototype": false, "allow-reference-on-first-task": false, "delete-before-retype": true }
  },
  "execution": {
    "max_concurrent_subagents": 10,
    "retry_limit": 3
  },
  "models": {
    "providers": {
      "ollama": { "host": "http://localhost:11434", "enabled": true },
      "openai": { "enabled": true, "apiKeyEnv": "OPENAI_API_KEY" }
    },
    "profiles": { "default": {...}, "local-only": {...} }
  }
}
```

**Plugin files:**

| File | Purpose |
|------|---------|
| `.opencode/plugins/methodology-engine.js` | Main plugin — lifecycle hooks, bootstrap injection, compaction |
| `.opencode/plugins/methodology-config.json` | User-editable config (TDD, execution, models) |
| `.opencode/plugins/lib/model-router.js` | Model discovery, capability profiling, routing table |
| `.opencode/plugins/lib/model-profiler.js` | Model tier classification (5 tiers, metadata-based) |
| `.opencode/plugins/lib/agent-factory.js` | Dynamic agent generation with persistence |

---

## MCP Servers

All MCP servers are configured in `opencode.json` under the `mcp` section. Each is a local Node.js process using the `@modelcontextprotocol/sdk`.

| MCP ID | Tool Namespace | Source | Purpose |
|--------|---------------|--------|---------|
| `browser_research` | `browser_research_*` | `mcp-servers/browser-research-mcp/` | Web search, page extraction, competitor scanning |
| `traceability` | `traceability_*` | `mcp-servers/traceability-mcp/` | Entity tracking, evidence recording, gap reports |
| `security` | `security_*` | `mcp-servers/security-mcp/` | Dependency scanning, secret detection, code security |
| `test_automation` | `test_automation_*` | `mcp-servers/test-automation-mcp/` | E2E browser testing, screenshots, visual regression |
| `web_downloader` | `web_downloader_*` | `mcp-servers/web-downloader-mcp/` | URL content download and extraction |
| `document_intake` | `document_intake_*` | `mcp-servers/document-intake-mcp/` | Document parsing, text/table extraction |
| `code_execution` | `code_execution_*` | `mcp-servers/code-execution-mcp/` | Command execution, project diagnostics |
| `monitoring` | `monitoring_*` | `mcp-servers/monitoring-mcp/` | Service health, logs, metrics, alerts |
| `ux_hci` | `ux_hci_*` | `mcp-servers/ux-hci-mcp/` | UX analysis, accessibility checks, form analysis |
| `ux_intelligence` | `ux_*` | `mcp-servers/ux-intelligence-mcp/` | Design system generation, palettes, typography, WCAG |
| `github` | `github_*` | `mcp-servers/github-mcp/` | GitHub API (PRs, issues, repos) |
| `atlassian` | `atlassian_*` | Remote (Atlassian MCP) | Jira and Confluence via Atlassian's hosted MCP |
| `atlassian_custom` | `atlassian_custom_*` | `mcp-servers/atlassian-mcp/` | Custom Atlassian integration with local build |

### UX Intelligence MCP (ux-intelligence-mcp)

Located at `mcp-servers/ux-intelligence-mcp/`, provides 10 tools for data-driven UX design:

| Tool | Input | Output |
|------|-------|--------|
| `ux_generate_design_system` | `productType`, `platform?`, `mood?`, `pageType?` | Complete design system (style, colors, typography, effects, anti-patterns, checklist) |
| `ux_search_guidelines` | `query`, `priority?`, `category?`, `limit?` | Ranked UX guidelines with checks and anti-patterns |
| `ux_get_palette` | `industry`, `mood?` | Color palette with hex codes and usage roles |
| `ux_get_typography` | `mood`, `industry?` | Font pairing with scale and Google Fonts import URL |
| `ux_get_style` | `productType` | Style recommendation with effects and best-for |
| `ux_check_accessibility` | `foreground`, `background`, `fontSize?` | WCAG ratio with AA/AAA pass/fail |
| `ux_get_anti_patterns` | `industry?`, `style?` | Anti-patterns to avoid |
| `ux_get_stack_guidelines` | `stack`, `component?` | Framework-specific component guidance (14 stacks) |
| `ux_list_product_types` | `query?`, `category?` | All 161 product types |
| `ux_list_styles` | `category?` | All 67 design styles |

**Data:** 7 JSON files — 67 styles, 161 product types, 19 palettes, 20 typography pairings, 99 UX guidelines, 29 anti-patterns, 14 stack guides.

---

## Agents

Agents are defined in `.opencode/agents/`. Each has a frontmatter block specifying mode, model, and permissions, followed by a system prompt.

### Primary Agent

| Agent | Model | Purpose |
|-------|-------|---------|
| `master-orchestrator` | `openai/gpt-5.5` | Coordinates the full SDLC. Dispatches phases as subagents. Manages context across 18-phase workflows. |

### Subagents

| Agent | Model | Purpose |
|-------|-------|---------|
| `market-researcher` | `openai/gpt-4.1-mini` | Industry research, competitor analysis, regulatory landscape |
| `document-analyst` | `openai/gpt-4.1-mini` | PDF/DOCX/XLSX extraction, requirement analysis |
| `product-analyst` | `openai/gpt-4.1-mini` | USP definition, FRs/NFRs, UX acceptance criteria |
| `story-writer` | `anthropic/claude-haiku-4-5` | EPIC → Feature → Story backlog with acceptance criteria |
| `architect` | `openai/gpt-5.1-codex` | System design, data models, API contracts |
| `backend-dev` | `openai/gpt-5.1-codex` | Backend implementation, services, Prisma, API routes |
| `frontend-dev` | `openai/gpt-5.1-codex` | Frontend implementation, components, UI flows |
| `code-reviewer` | `openai/gpt-4.1-mini` | Code review, pattern correctness, merge risk |
| `test-engineer` | `openai/gpt-4.1-mini` | Typecheck, lint, unit, integration, e2e, browser regression |
| `ux-reviewer` | `anthropic/claude-sonnet-4-5` | Usability, accessibility, auth UX, responsive behavior |
| `security-reviewer` | `openai/gpt-4.1-mini` | Dependency scan, secret scan, code security, API security |
| `release-manager` | `openai/gpt-4.1-mini` | GitHub PR, release readiness, rollout, monitoring |
| `traceability-recorder` | `openai/gpt-4.1-mini` | Audit trail, entity tracking, gap reports |
| `confluence-writer` | Project-level agent | Confluence page CRUD and publishing |

### Dynamic Agents

Agents generated on demand by the plugin's `AgentFactory` when no predefined agent matches the task. Persist to `.opencode/agents/dynamic/<hash>.md`. Same task hash = same agent reuse.

---

## Project Skills

Located in `.opencode/skills/`. Domain-specific skills  lifecycle.

| Skill | Purpose |
|-------|---------|
| `idea-discovery` | Frame business hypotheses, discovery briefs, open execution chain |
| `fullstack-business-analyst` | Requirements analysis, Jira alignment, scope refinement |
| `fullstack-solution-architect` | Build-ready architecture, API contracts, data models |
| `fullstack-typescript-developer` | Production-grade implementation, refactoring, navigation wiring |
| `fullstack-tester-reviewer` | Multi-layer test validation, ship decisions |
| `fullstack-security-reviewer` | Dependency, secret, code, API security scanning |
| `fullstack-code-reviewer` | Structured code review, merge-risk analysis |
| `fullstack-git-commit-tracker` | Commit preparation aligned to tracking and changelog |
| `github-pr-management` | Branch push, PR creation, checks review, merge readiness |
| `browser-research` | Evidence-based external research and competitor analysis |
| `confluence-writer` | Structured Confluence page creation and updates |
| `document-intake` | Requirement and evidence extraction from source documents |
| `epic-feature-story-writing` | EPIC → Feature → Story backlog authoring with Jira sync |
| `langgraph-ai-developer` | AI agent/workflow implementation with LangGraph. Covers supervisor/sub-agent topology, tool-based handoff, parallel execution, shared state, human-in-the-loop |
| `monitoring-review` | Runtime health, logs, metrics, anomaly review |
| `release-management` | PR quality, release notes, release readiness |
| `sprint-planner` | Sprint planning, prioritization, capacity tradeoffs |
| `traceability-validation` | Lifecycle traceability gap analysis |
| `ux-review` | UX, usability, accessibility evidence review |

**Aliases (backward compatibility):**
- `product-analysis` → `fullstack-business-analyst`
- `architecture-design` → `fullstack-solution-architect`
- `implementation` → `fullstack-typescript-developer`
- `testing` → `fullstack-tester-reviewer`
- `security-review` → `fullstack-security-reviewer`

---

## Methodology Skills

Located in `.opencode/skills/methodology/`. Portable, process-focused skills that can be used in any project. These are auto-registered by the plugin's `config` hook.

### Core Workflow Chain

```
brainstorming → writing-plans → subagent-driven-development → finishing-a-development-branch
                                   ↕
                             test-driven-development
                                   ↕
                              executing-plans
```

| Skill | When to Use | What It Does |
|-------|-------------|-------------|
| `using-framework` | Session start (auto-loaded) | Bootstrap — establishes skill-first behavior, model routing confirmation, red flags |
| `brainstorming` | Before any creative/implementation work | Refines ideas into designs through structured dialogue. Explores context, proposes approaches, writes design doc |
| `writing-plans` | With an approved design | Breaks work into 2-5 minute tasks with exact file paths, complete code, verification steps. Supports dependency declarations for parallel execution |
| `test-driven-development` | Always during implementation | Enforces RED-GREEN-REFACTOR. Hardcore mode (default): code before failing test must be deleted. Configurable strictness |
| `subagent-driven-development` | When executing a plan with independent tasks | Dispatches fresh subagent per task. Parallel batch dispatch for independent tasks. Two-stage review (spec compliance then code quality). Auto-retry with model escalation. Dynamic agent fallback |
| `executing-plans` | Lightweight alternative for coupled tasks | Executes plan inline without subagent dispatch. Batch checkpoints for user review |

### Debugging & Fixing

| Skill | When to Use | What It Does |
|-------|-------------|-------------|
| `systematic-debugging` | When diagnosing a bug or failure | 4-phase process: reproduce → hypothesize → isolate → fix & verify. Write failing test before changing code |
| `verification-before-completion` | After applying a fix | Confirms the fix actually resolves the issue. Runs reproduction test, full suite, documents evidence |
| `fix-issue` command | Bug fix workflow | Shortcut combining systematic-debugging + TDD + verification + accidental-removal check |

### Code Review

| Skill | When to Use | What It Does |
|-------|-------------|-------------|
| `requesting-code-review` | Before asking for a review | Pre-submission checklist: tests pass, no debug artifacts, error paths tested, no security red flags |
| `receiving-code-review` | When responding to review feedback | How to classify comments (correctness / design / style / question / suggestion), respond, and apply changes |

### Branch Management

| Skill | When to Use | What It Does |
|-------|-------------|-------------|
| `using-git-worktrees` | When working on parallel branches | Creates isolated working directory per branch. Shares .git directory. Clean teardown |
| `finishing-a-development-branch` | When implementation is complete | Final verification, commit review, push. Presents options: merge to main / create PR / keep / discard |

### Quality Governance

| Skill | When to Use | What It Does |
|-------|-------------|-------------|
| `writing-skills` | When creating or modifying methodology skills | Structure guidelines, content anti-patterns, testing checklist. Self-reference handling for modifications to itself |
| `ux-skills` | When a task involves UI/UX decisions | Maps design scenarios to specific `ux_intelligence` MCP tools. Provides workflow: generate design system → stack guidelines → anti-patterns → implement → verify accessibility |

---

## Commands

Commands are defined in `.opencode/commands/` and invoked via `/command-name <args>` in OpenCode.

| Command | Trigger | Description | Phases |
|---------|---------|-------------|--------|
| `/run-full-sdlc` | Start a new feature | Full SDLC from idea to release | All 18 phases — each dispatched as subagent to conserve context |
| `/build-story` | Build an existing story | Build, test, review, secure, trace single story | Implementation → verification → review → security → trace |
| `/fix-issue` | Bug or defect | Diagnose → TDD fix → verify → commit. Skips all pre-build and post-build phases | Systematic debugging → TDD → verification → accidental-removal check → test suite |
| `/discover-and-write-backlog` | New idea | Research idea, produce backlog | Market research → competitor analysis → USP → EPIC → Feature → Story |
| `/traceability-check` | Audit | Check traceability completeness | Gap analysis on existing entities |
| `/continue-sdlc` | Resume mid-flow | Resume from a specific phase after session capacity reached | Reads prior checkpoints from disk, continues from specified phase |
| `/compact-session` | Free context | Request session compaction when nearing context limit | Triggers OpenCode-built-in compaction |

### Phase Dispatch Pattern (run-full-sdlc)

Each phase is dispatched as a separate subagent to keep the orchestrator's context minimal:

```
Phase loop:
  1. Orchestrator calls task(agent_type=<phase-agent>, prompt=phase instructions)
  2. Subagent executes the phase and writes checkpoint to disk
  3. Subagent returns "DONE" + checkpoint file path
  4. Orchestrator records ONE LINE: "Phase N done → <path>"
  5. Orchestrator continues to next phase
```

The orchestrator never keeps more than one line per phase in its own context.

---

## Configuration

### opencode.json

The main configuration file at the project root controls:

| Section | Purpose |
|---------|---------|
| `instructions` | References `AGENTS.md` which defines the SDLC phase mapping |
| `agent` | Defines the master-orchestrator's model, permissions, tool access |
| `provider` | LLM provider configuration (Ollama, OpenAI, Anthropic) with model lists |
| `model` | Default model for the session |
| `mcp` | All 13 MCP server registrations with paths and environment variables |

### methodology-config.json

Plugin-specific configuration at `.opencode/plugins/methodology-config.json`:

| Key | Default | Purpose |
|-----|---------|---------|
| `tdd.strictness` | `"hardcore"` | TDD enforcement level |
| `execution.max_concurrent_subagents` | `10` | Max parallel subagents per batch |
| `execution.retry_limit` | `3` | Max retry attempts before escalating to user |
| `models.providers` | ollama + openai | Which providers to probe for model discovery |
| `models.profiles` | default + local-only | Model routing profiles (selectable via `/use-model-profile`) |

### AGENTS.md

Located at the project root. Defines the 18-phase SDLC lifecycle with:
- Phase → Agent mapping
- Critical agent launch rules
- Gate criteria (minimum evidence per phase, fix-loop requirements)
- Browser regression requirements for UI changes
- UI discoverability and role-visibility rules

---

## Workflow Examples

### Building a New Feature

```
User: "/run-full-sdlc Build a customer analytics dashboard"

1. Plugin injects bootstrap → agent loads using-framework
2. agent presents routing table → user confirms
3. Phase 1: agent dispatches market-researcher → research complete → "Phase 1 done → checkpoints/01-market-research.md"
4. Phase 2: agent dispatches market-researcher → competitor analysis
...
18. Phase 18: agent dispatches confluence-writer → Confluence published
```

### Fixing a Bug

```
User: "/fix-issue Login form doesn't validate email format"

1. Agent loads systematic-debugging → reproduces issue → identifies root cause
2. Agent writes failing test → confirms it fails
3. Agent implements fix → confirms test passes
4. Agent reviews git diff → no accidental removals confirmed
5. Agent runs full test suite → all green
6. Agent commits with message referencing the bug
```

### Designing a UI

```
User: "Build a landing page for the analytics dashboard"

1. Agent loads brainstorming skill → explores requirements
2. Agent calls ux_generate_design_system("analytics dashboard", "landing")
   → Returns: style=Minimalism + Trust, palette=professional blues, typography=Inter
3. Agent calls ux_get_stack_guidelines("next")
   → Returns: Next.js App Router patterns, Server/Client component split
4. Agent presents design → user approves
5. Agent loads writing-plans → creates task plan
6. Agent loads subagent-driven-development → dispatches tasks in parallel
7. Agent loads finishing-a-development-branch → pushes to GitHub
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Session too large to compact" | Too many messages across 18 SDLC phases | Use `/fix-issue` for targeted fixes. Use `/continue-sdlc` to resume mid-flow. Each phase is now dispatched as subagent. |
| No bootstrap injected | Plugin not loaded | Ensure `.opencode/plugins/methodology-engine.js` exists. Restart OpenCode session. |
| "No models found" | Ollama not running or no API key | Start `ollama serve`. Set `OPENAI_API_KEY`. |
| Routing table shows "Not available" | No models discovered | Start at least one Ollama model or configure OpenAI provider in `methodology-config.json`. |
| MCP tools not showing | MCP not registered or not built | Check `opencode.json` for the MCP entry. Run `npm run build` in the MCP directory. |
| Dynamic agents not generated | Agent factory not initialized | Check `.opencode/plugins/lib/agent-factory.js` exists. Verify plugin loads without errors. |
| TDD not enforced | Skill not loaded | Agent should auto-load `test-driven-development` during implementation. Confirm bootstrap shows "TDD is required". |
