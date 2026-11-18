# Framework

The framework is the part you copy into a project. It turns OpenCode into an orchestrated
delivery team: one orchestrator, 14 specialist subagents, 9 slash commands, 40 skills,
and a plugin that routes each agent to an appropriate model.

- **Install:** copy `.opencode/` and `AGENTS.md` into your project and start from
  [`opencode.example.json`](opencode.example.json). See [getting started](../docs/getting-started.md).
- **How a run flows:** [lifecycle](../docs/sdlc-lifecycle.md) · **Why it's built this way:** [ADRs](../docs/adr/)

## Contents

```text
framework/
├── .opencode/
│   ├── plugins/
│   │   ├── methodology-engine.js     OpenCode plugin entry point
│   │   ├── methodology-config.json   TDD strictness, execution limits, routing profiles
│   │   └── lib/
│   │       ├── model-router.js       discovery, agent assignment, role table, cache
│   │       ├── model-profiler.js     capability-tier classification
│   │       └── agent-factory.js      dynamic agent generator (library; not yet wired in)
│   ├── agents/      15 agent definitions
│   ├── commands/    9 slash commands
│   └── skills/      methodology, role and alias skills
├── AGENTS.md                 phase rules, gates and agent launch rules (loaded as instructions)
├── opencode.example.json     models, agents and MCP servers; secrets via {env:VAR}
└── test/                     profiler, router, agent-factory and end-to-end routing tests
```

## The plugin

`methodology-engine.js` registers three OpenCode hooks:

| Hook | What it does |
|---|---|
| `config` | Registers the methodology skills path and **assigns a model to every agent** (see [model routing](../docs/model-routing.md)). |
| `experimental.chat.messages.transform` | Prepends a bootstrap to the first user message: skill-first rules, TDD mode, the role routing table, agent model assignments and execution limits. Guarded so it is injected once. |
| `experimental.session.compacting` | Adds the methodology rules and `AGENTS.md` pointer to the context kept through compaction. |

`methodology-config.json`:

| Key | Default | Purpose |
|---|---|---|
| `tdd.strictness` | `hardcore` | In hardcore mode, code written before a failing test must be deleted |
| `execution.max_concurrent_subagents` | `10` | Parallel subagents per batch |
| `execution.retry_limit` | `3` | Attempts before escalating to the user |
| `models.activeProfile` | `default` | Which role-routing profile to use |
| `models.profiles` | `default`, `local-only` | Capability requirements per role |

## Agents

Each agent is a Markdown file: frontmatter for mode, capability needs and permissions, then its
system prompt. Edits always ask; shell commands ask unless explicitly allowed (e.g. `git status`,
test runners).

| Agent | Mode | Model tier it gets | Responsibility |
|---|---|---|---|
| [`architect`](.opencode/agents/architect.md) | subagent | code-review or better | Designs architecture, APIs, data model, integrations, security, observability, deployment, and implementation approach. |
| [`backend-dev`](.opencode/agents/backend-dev.md) | subagent | code-review or better | Implements backend stories, APIs, services, database logic, migrations, and backend tests. |
| [`code-reviewer`](.opencode/agents/code-reviewer.md) | subagent | code-review or better | Performs structured code-review gate checks before release, covering correctness, contract drift, tests, docs, and merge risk. |
| [`document-analyst`](.opencode/agents/document-analyst.md) | subagent | fast-local or better | Reads documents and extracts structured requirements, research evidence, risks, assumptions, and open questions. |
| [`frontend-dev`](.opencode/agents/frontend-dev.md) | subagent | code-review or better | Implements frontend stories, UI flows, components, forms, state, accessibility hooks, and frontend tests. |
| [`market-researcher`](.opencode/agents/market-researcher.md) | subagent | fast-local or better | Researches market, competitors, pricing, UX patterns, and feature expectations using evidence. |
| [`master-orchestrator`](.opencode/agents/master-orchestrator.md) | primary | reasoning | Coordinates the full AI SDLC from idea to research, backlog, UX design, architecture, build, test, UX review, security, release, monitoring, and traceability. |
| [`product-analyst`](.opencode/agents/product-analyst.md) | subagent | code-review or better | Converts research and documents into product vision, USP, FRs, NFRs, risks, assumptions, dependencies, and EPIC candidates. |
| [`release-manager`](.opencode/agents/release-manager.md) | subagent | fast-local or better | Prepares GitHub PRs, release notes, CI checks, deployment handoff, monitoring checks, and release readiness. |
| [`security-reviewer`](.opencode/agents/security-reviewer.md) | subagent | code-review or better | Performs AppSec checks including dependency scans, secret scans, code security, API risks, and container risks. |
| [`story-writer`](.opencode/agents/story-writer.md) | subagent | fast-local or better | Creates delivery-ready backlog using EPIC → Feature → Story format with acceptance criteria and traceability. |
| [`test-engineer`](.opencode/agents/test-engineer.md) | subagent | fast-local or better | Runs unit, integration, end-to-end, regression, visual, and evidence-backed tests. |
| [`traceability-recorder`](.opencode/agents/traceability-recorder.md) | subagent | fast-local or better | Maintains audit trail across idea, research, EPIC, Feature, Story, code, tests, UX, security, PR, release, and monitoring. |
| [`ui-designer`](.opencode/agents/ui-designer.md) | subagent | code-review or better | Design-system-aware product UI designer that creates consistent, accessible, responsive, implementation-ready web screens matching the existing application style. |
| [`ux-reviewer`](.opencode/agents/ux-reviewer.md) | subagent | fast-local or better | Reviews usability, HCI quality, accessibility, authentication UX, authorization UX, flow clarity, and visual consistency. |

## Commands

| Command | Description |
|---|---|
| [`/build-story`](.opencode/commands/build-story.md) | Build, test, review, secure, and trace a single story |
| [`/compact-session`](.opencode/commands/compact-session.md) | Request session compaction to free context window space for long-running workflows |
| [`/continue-sdlc`](.opencode/commands/continue-sdlc.md) | Resume SDLC workflow from a specific phase after session capacity was reached |
| [`/discover-and-write-backlog`](.opencode/commands/discover-and-write-backlog.md) | Research an idea and produce EPIC → Feature → Story backlog |
| [`/fix-issue`](.opencode/commands/fix-issue.md) | Diagnose an issue, apply a fix with TDD, verify, and commit — without running the full SDLC |
| [`/quick-change`](.opencode/commands/quick-change.md) | Apply small changes, screen adjustments, or UAT feedback items without running the full SDLC |
| [`/run-full-sdlc`](.opencode/commands/run-full-sdlc.md) | Run full AI SDLC from idea to release-ready feature without stopping between phases |
| [`/show-routing`](.opencode/commands/show-routing.md) | Display current model routing, including task-tier routing and OpenCode agent model assignments |
| [`/traceability-check`](.opencode/commands/traceability-check.md) | Check traceability completeness for a feature, story, or release |

## Skills

Skills are loaded on demand by agents with OpenCode's `skill` tool. The bootstrap requires
agents to check for a relevant skill before acting.

### Methodology skills (15)

Portable, process-focused skills. Most are adapted from
[obra/superpowers](https://github.com/obra/superpowers) (MIT); see
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

| Skill | When to use |
|---|---|
| [`brainstorming`](.opencode/skills/methodology/brainstorming/SKILL.md) | Use before any creative work — creating features, building components, adding functionality, or modifying behavior. Refines ideas into designs through structured dialogue before implementation. |
| [`executing-plans`](.opencode/skills/methodology/executing-plans/SKILL.md) | Use as a lightweight alternative to subagent-driven-development when tasks are tightly coupled or require staying in a single session. Executes plan tasks inline with batch checkpoints. |
| [`finishing-a-development-branch`](.opencode/skills/methodology/finishing-a-development-branch/SKILL.md) | Use when implementation tasks are complete. Verifies everything is in order and presents branch completion options to the user. |
| [`receiving-code-review`](.opencode/skills/methodology/receiving-code-review/SKILL.md) | Use when receiving feedback from a code review. Guides how to process, respond to, and act on review comments. |
| [`requesting-code-review`](.opencode/skills/methodology/requesting-code-review/SKILL.md) | Use before asking for a code review. Runs a pre-review checklist to catch common issues before the reviewer sees the code. |
| [`stitch-design`](.opencode/skills/methodology/stitch-design/SKILL.md) | Use when the task involves generating, editing, or managing UI designs with Google Stitch — screen design, design system management, design variants, asset download, and frontend implementation using downloaded reference assets. |
| [`subagent-driven-development`](.opencode/skills/methodology/subagent-driven-development/SKILL.md) | Use when executing an implementation plan with independent tasks. Dispatches fresh subagents per task in parallel batches with two-stage review (spec compliance then code quality), auto-retry with model escalation, and dynamic agent creation. |
| [`systematic-debugging`](.opencode/skills/methodology/systematic-debugging/SKILL.md) | Use when diagnosing a bug, failure, or unexpected behavior. Follows a 4-phase root cause process before making any changes. |
| [`test-driven-development`](.opencode/skills/methodology/test-driven-development/SKILL.md) | Use when implementing any feature or bug fix, BEFORE writing implementation code. Enforces RED-GREEN-REFACTOR cycle. |
| [`using-framework`](.opencode/skills/methodology/using-framework/SKILL.md) | Use at session start to bootstrap the development methodology. Establishes skill-first behavior, model routing confirmation, and process rules before any work begins. |
| [`using-git-worktrees`](.opencode/skills/methodology/using-git-worktrees/SKILL.md) | Use when working on parallel isolated branches. Creates a separate working directory for each branch. |
| [`ux-skills`](.opencode/skills/methodology/ux-skills/SKILL.md) | Use when the task involves UI/UX design decisions — building interfaces, choosing styles, selecting colors, implementing components, or checking accessibility. Calls the ux-intelligence MCP for data-driven design guidance. |
| [`verification-before-completion`](.opencode/skills/methodology/verification-before-completion/SKILL.md) | Use after applying a fix or making a change. Confirms the fix actually resolves the issue before marking complete. |
| [`writing-plans`](.opencode/skills/methodology/writing-plans/SKILL.md) | Use when you have an approved design or requirements for a multi-step task. Breaks the work into bite-sized implementation tasks with exact file paths, complete code, and verification steps. Supports dependency declarations for parallel execution. |
| [`writing-skills`](.opencode/skills/methodology/writing-skills/SKILL.md) | Use when creating or modifying methodology skills. Handles self-reference by using external principles when modifying writing-skills itself. |

### Role skills (20)

Used by the specialist agents. Most include `SYSTEM_PROMPT.md`, `TASK_TEMPLATES.md`,
`OUTPUT_FORMATS.md` and a `CHECKER.md` the agent runs before handing back.

| Skill | Purpose |
|---|---|
| [`accessibility-testing`](.opencode/skills/accessibility-testing/SKILL.md) | Run WCAG 2.1 AA accessibility and contrast checks on code changes |
| [`browser-research`](.opencode/skills/browser-research/SKILL.md) | Run evidence-based web, market, and competitor research using browser and search MCP tools. |
| [`confluence-writer`](.opencode/skills/confluence-writer/SKILL.md) | Create or update Confluence pages with technical documentation, diagrams, embedded specs, and structured page content. |
| [`document-intake`](.opencode/skills/document-intake/SKILL.md) | Extract requirements, evidence, and structured findings from local documents. |
| [`epic-feature-story-writing`](.opencode/skills/epic-feature-story-writing/SKILL.md) | Create delivery-ready backlog items in EPIC to Feature to Story form with acceptance criteria and traceability. |
| [`fullstack-business-analyst`](.opencode/skills/fullstack-business-analyst/SKILL.md) | Convert user requirements into detailed requirement documentation, Jira updates, and traceable delivery scope. |
| [`fullstack-code-reviewer`](.opencode/skills/fullstack-code-reviewer/SKILL.md) | Perform structured code reviews across application, shared-package, test, and documentation changes. |
| [`fullstack-git-commit-tracker`](.opencode/skills/fullstack-git-commit-tracker/SKILL.md) | Prepare commits with aligned tracking-log and changelog updates. |
| [`fullstack-security-reviewer`](.opencode/skills/fullstack-security-reviewer/SKILL.md) | Review full-stack code, dependencies, auth, and runtime posture for evidence-backed security findings. |
| [`fullstack-solution-architect`](.opencode/skills/fullstack-solution-architect/SKILL.md) | Produce implementation-ready system design, API contracts, state flows, and developer handoff guidance. |
| [`fullstack-tester-reviewer`](.opencode/skills/fullstack-tester-reviewer/SKILL.md) | Run structured full-stack validation across test layers and return a clear ship decision with evidence. |
| [`fullstack-typescript-developer`](.opencode/skills/fullstack-typescript-developer/SKILL.md) | Implement production-grade TypeScript changes with strong type safety, testing, contract awareness, and documentation alignment. |
| [`github-pr-management`](.opencode/skills/github-pr-management/SKILL.md) | Manage branch publish, PR creation, checks review, and merge-readiness updates with Jira linkage. |
| [`idea-discovery`](.opencode/skills/idea-discovery/SKILL.md) | Frame ideas into evidence-ready discovery briefs and open the execution chain in Jira and Confluence. |
| [`langgraph-ai-developer`](.opencode/skills/langgraph-ai-developer/SKILL.md) | Implement production-grade AI agents, multi-agent teams, and workflows using LangGraph with type safety, state management, orchestration patterns, testing, and LLM best practices. |
| [`monitoring-review`](.opencode/skills/monitoring-review/SKILL.md) | Review runtime health, logs, metrics, alerts, and anomalies after testing or release activity. |
| [`release-management`](.opencode/skills/release-management/SKILL.md) | Prepare pull requests, release notes, rollout evidence, and release readiness decisions. |
| [`sprint-planner`](.opencode/skills/sprint-planner/SKILL.md) | Review backlog scope, prioritize stories, and produce a realistic sprint plan with explicit risks and capacity tradeoffs. |
| [`traceability-validation`](.opencode/skills/traceability-validation/SKILL.md) | Validate complete lifecycle traceability from idea and research through build, test, release, and monitoring. |
| [`ux-review`](.opencode/skills/ux-review/SKILL.md) | Review UX, usability, accessibility, authentication and authorization flow quality for UI changes with evidence-backed findings. |

### Aliases (5)

Short names that point to a canonical role skill.

| Alias | Points to |
|---|---|
| [`architecture-design`](.opencode/skills/architecture-design/SKILL.md) | Alias for fullstack-solution-architect. Use the canonical fullstack-solution-architect skill. |
| [`implementation`](.opencode/skills/implementation/SKILL.md) | Alias for fullstack-typescript-developer. Use the canonical fullstack-typescript-developer skill. |
| [`product-analysis`](.opencode/skills/product-analysis/SKILL.md) | Alias for fullstack-business-analyst. Use the canonical fullstack-business-analyst skill. |
| [`security-review`](.opencode/skills/security-review/SKILL.md) | Alias for fullstack-security-reviewer. Use the canonical fullstack-security-reviewer skill. |
| [`testing`](.opencode/skills/testing/SKILL.md) | Alias for fullstack-tester-reviewer. Use the canonical fullstack-tester-reviewer skill. |

## Tests

```bash
npm run test:framework
```

| File | Covers |
|---|---|
| `test/model-profiler.test.mjs` | tier classification for local and hosted models |
| `test/model-router.test.mjs` | model discovery from config, order-independent model-set hash |
| `test/agent-factory.test.mjs` | dynamic agent reuse, isolation and `ask` permissions |
| `test/routing-e2e.test.mjs` | the plugin's real hooks in a throwaway project: per-agent assignment, role table, pins, local flag, loadable exports |
