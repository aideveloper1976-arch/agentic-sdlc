---
name: using-framework
description: "Use at session start to bootstrap the development methodology. Establishes skill-first behavior, model routing confirmation, and process rules before any work begins."
---

# Development Methodology Framework

Welcome. This framework provides structured workflows for building software. Follow these instructions before doing anything else.

## Step 1: Present Model Routing Configuration

Look at the model routing table that was injected into the first message of this session. It shows which models are assigned to which development tasks (orchestrator, implementer, reviewer).

Present it to the user and ask:

> "Here is the current model routing configuration for this session. It was auto-detected from your available models. Would you like to:
> 1. **Accept** — use this configuration
> 2. **Edit** — I'll open the config file for you to modify
> 3. **Switch profile** — choose a different profile (e.g., local-only)

Wait for their response before proceeding.

If they choose **Edit**, use the Read tool to read `.opencode/plugins/methodology-config.json`, let them tell you what to change, and use the Edit tool to apply changes. Then confirm the routing table is correct.

If they choose **Switch profile**, ask which profile and update the config.

Once accepted, proceed to Step 2.

## Step 2: Skill-First Rule

**Check for relevant skills before EVERY response.** Before you act, ask yourself: "Does any skill in methodology/ apply to what I'm about to do?" If there is even a 1% chance, invoke the skill.

- Use OpenCode's native `skill` tool to load a skill by name
- After loading, follow the skill's instructions exactly
- If a skill has a checklist, create a `todowrite` for each item
- Announce which skill you are using and why before proceeding

## Step 3: Skill Discovery

The following methodology skills are available. Use the `skill` tool to load any of them:

| Skill | When to Use |
|-------|-------------|
| `brainstorming` | Before any creative/implementation work — refines ideas into designs |
| `writing-plans` | When you have an approved design — breaks it into bite-sized tasks with TDD |
| `test-driven-development` | Always during implementation — mandatory RED-GREEN-REFACTOR cycle |
| `subagent-driven-development` | When executing a plan with independent tasks — fresh agent per task + 2-stage review |
| `executing-plans` | Lightweight inline alternative when tasks are tightly coupled |
| `systematic-debugging` | When diagnosing a bug or failure — 4-phase root cause process |
| `verification-before-completion` | After fixing something — confirms the fix actually resolved the issue |
| `requesting-code-review` | Before asking for a code review — pre-review checklist |
| `receiving-code-review` | When responding to review feedback |
| `using-git-worktrees` | When working on parallel isolated branches |
| `finishing-a-development-branch` | When implementation tasks are complete — merge/PR/prune options |
| `writing-skills` | When creating or modifying methodology skills — quality governance |

## Step 4: Skill Priority

When multiple skills could apply, use this order:

1. **Process skills first** (brainstorming, debugging) — these determine HOW to approach the task
2. **Implementation skills second** (test-driven-development, subagent-driven-development) — these guide execution

Examples:
- "Let's build X" → brainstorming first, then writing-plans, then subagent-driven-development
- "Fix this bug" → systematic-debugging first, then test-driven-development
- "I need to implement this function" → test-driven-development

## Step 5: Red Flags

These thoughts mean STOP — you are rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "TDD would slow me down here" | TDD is faster than debugging. |
| "This is different because..." | No it isn't. Use the skill. |
| "I already know how to do this" | Knowing the concept ≠ using the skill. |

## Step 6: Tool Mapping for OpenCode

When skills reference tools from other platforms (Claude Code, Codex, Gemini), use these OpenCode equivalents:

| Referenced Tool | OpenCode Equivalent |
|-----------------|---------------------|
| `TodoWrite` | `todowrite` |
| `Task` (with subagents) | `task` tool with `subagent_type` |
| `Skill` | `skill` tool (native) |
| `Read`, `Write`, `Edit` | Native read/write/edit tools |
| `Bash` | `bash` tool |
| `Grep` | `grep` tool |
| `Glob` | `glob` tool |

## Step 7: Important Rules

1. **User instructions take precedence over skills.** If AGENTS.md or the user explicitly says "don't do X", don't do X. The user is in control.
2. **Skills are mandatory, not optional.** If a skill applies to your task, you must use it. This is not negotiable.
3. **Follow skills exactly.** Do not adapt away the discipline. Skills exist for a reason.
4. **TDD is required during any implementation.** The strictness level is configured in `methodology-config.json`. By default it is **hardcore** mode.

## Checklist

- [ ] Present model routing table to user and get confirmation
- [ ] Announce: "Following the development methodology framework"
- [ ] Before each action, check if a skill applies
- [ ] Load and follow skills before acting
- [ ] Create todowrite items for skill checklists
