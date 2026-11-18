---
description: Diagnose an issue, apply a fix with TDD, verify, and commit — without running the full SDLC
agent: master-orchestrator
---

Fix a specific issue or bug using the methodology framework. This command focuses on
the fix cycle only — it does NOT run market research, UX design, backlog, or release phases.

**CONTEXT MANAGEMENT:** Dispatch ALL work to subagents. The orchestrator records only
one line per phase. See the dispatch template below.

$ARGUMENTS

## Workflow (Dispatch Each Step as a Subagent)

### Step 1: Diagnose

Dispatch to a subagent (backend-dev or frontend-dev depending on the issue):

```
task(
  description="Diagnose: <issue>",
  prompt="Load the systematic-debugging skill. Reproduce the issue, characterize the failure,
          identify root cause. Write a failing test that reproduces the bug.
          Report: what was found, what the root cause is, and the failing test SHA.",
  subagent_type=<appropriate agent>
)
```

Receive report. Orchestrator records: `Diag done → <summary of root cause>`

### Step 2: Implement fix

Dispatch to the same agent type:

```
task(
  description="Fix: <issue>",
  prompt="Load test-driven-development skill. The root cause is: <summary>.
          Fix the root cause, not the symptom. Confirm the new test passes.
          Run accidental removal check: review git diff for any deleted functionality,
          removed error handling, removed edge cases, or removed fallback logic.
          If any real functionality was removed, add it back.
          Commit with a descriptive message.",
  subagent_type=<same agent>
)
```

Receive report. Orchestrator records: `Fix done → <commit SHA>`

### Step 3: Verify no regressions

Dispatch verification:

```
task(
  description="Verify: <issue>",
  prompt="Run the project's test suite: typecheck, lint, unit tests, build.
          If the fix touches UI, run browser validation on the affected flow.
          If security-related, run security scan.
          Report: all results (pass/fail for each check).",
  subagent_type=<test-engineer or appropriate>
)
```

Receive report. Orchestrator records: `Verify done → <results summary>`

### Step 4: Summarize

Tell the user what was done:

- What was wrong (root cause)
- What was fixed (commit SHA)
- How it was verified (tests, checks, browser validation)
- Accidental removal check result

## Rules

- Each step is dispatched as a SUBAGENT. The orchestrator does NOT execute any step inline.
- The orchestrator records ONLY one line per step in its own context.
- Follow TDD: write failing test BEFORE fix code
- Fix root cause, not symptom
- Run full test suite before commit — not just the new test
- If the fix touches UI, run browser validation on the affected flow
- Do NOT run market research, competitor analysis, USP definition, UX design, backlog creation, architecture review, PR preparation, or release phases
