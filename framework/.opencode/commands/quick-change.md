---
description: Apply small changes, screen adjustments, or UAT feedback items without running the full SDLC
agent: master-orchestrator
---

Apply a well-defined small change — UAT feedback, screen adjustments, content changes,
style tweaks, or minor feature additions. This command is for changes where the
requirement is clear and the scope is small.

**CONTEXT MANAGEMENT:** Dispatch ALL implementation work to subagents. The orchestrator
records only one line per step. The orchestrator MUST NOT execute the change itself.

$ARGUMENTS

## Workflow (Each Step is a Subagent)

### Step 1: Understand and implement

Read the description. If the requirement is ambiguous, ask one clarifying question — then
dispatch the implementation to a subagent:

```
task(
  description="Implement: <change>",
  prompt="Description: $ARGUMENTS

          Instructions:
          1. Read the existing code paths before editing.
          2. For UI changes involving colors/typography/layout: call ux-intelligence MCP
             (ux_get_palette, ux_get_style, ux_search_guidelines, ux_check_accessibility,
             ux_get_stack_guidelines) for data-driven design guidance.
          3. Apply the change. Follow existing component patterns. Maintain responsive behavior.
          4. For functional changes: write a test first (TDD). For pure UI changes
             (text, layout, styles), a visual check is sufficient.
          5. For any role-, permission-, tenant-, actor-type-, auth-, or authorization-
             related change: inspect both the UI visibility/page guard logic and the
             backing API/middleware/service authorization path before editing.
             Add or update tests that prove:
             - the authorized actor succeeds,
             - the unauthorized actor fails,
             - privileged/system actor behavior matches product intent.
             Include a short authorization parity note in the report with the UI gate
             file/path, API gate file/path, and whether they match.
          6. Run accidental removal check: review git diff for any deleted functionality,
             removed error handling, removed edge cases, removed fallback logic.
             If any real functionality was removed, add it back.
          7. Commit with a descriptive message referencing the change request or UAT item.
             Example: 'fix: adjust spacing per UAT feedback' or 'style: update button color'
          8. Report DONE with commit SHA and a summary of what was changed.",
  subagent_type=<appropriate agent (frontend-dev for UI, backend-dev for API)>
)
```

Receive report. Orchestrator records: `Change done → <commit SHA>`

### Step 2: Verify

Dispatch verification:

```
task(
  description="Verify: <change>",
  prompt="Run typecheck, lint, unit tests, and build. Report pass/fail for each.
          For UI changes: also run browser validation on the affected flow.
          For auth/authorization-related changes: verify authorization parity across
          UI visibility, route/page guards, and API/middleware/service enforcement,
          including allowed, denied, and privileged/system actors.",
  subagent_type=<test-engineer or appropriate>
)
```

Receive report. Orchestrator records: `Verify done → <results>`

### Step 3: Summarize

Tell the user: what was changed, commit SHA, verification results.

## Rules

- The orchestrator does NOT execute any step inline. All work is dispatched to subagents.
- For UI/text changes, a failing test is not required — visual verification is sufficient
- For logic changes, TDD is required
- For auth/authorization changes, authorization parity across UI and backend enforcement is required
- Always run accidental removal check — UI changes commonly hide or remove elements
- Do NOT run brainstorming, systematic-debugging, market research, competitor analysis,
  USP definition, UX design, backlog creation, architecture review, PR preparation, or release phases
