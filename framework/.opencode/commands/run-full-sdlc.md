---
description: Run full AI SDLC from idea to release-ready feature without stopping between phases
agent: master-orchestrator
---

Run the full AI SDLC workflow for this idea:

$ARGUMENTS

CRITICAL CONTEXT LIMIT RULE:

This workflow runs 18 phases. The orchestrator MUST keep context usage minimal
by dispatching each phase as a subagent and keeping only a one-line status per
phase in its own conversation. Phase details go to checkpoint files, NOT into
the orchestrator's conversation context.

Pattern for every phase:
```
Phase N: dispatch subagent → subagent writes checkpoint file → subagent returns "DONE"
Orchestrator records: "Phase N done → <checkpoint-file-path>"
Orchestrator continues to Phase N+1 immediately
```

DO NOT:
- Re-list what the subagent produced. It's in the checkpoint file.
- Include subagent output in the conversation. It stays in the subagent's context.
- Write long summaries. A single line per phase is the maximum.

CONTEXT MANAGEMENT RULES:

1. After dispatching a phase to a subagent, record ONLY: `Phase N complete → <path>`
2. Do not include the subagent's output text in your own context
3. If you need to reference a prior phase's result, read the checkpoint file, don't recall from conversation
4. After every 3 phases, if the session is getting long, instruct the user to run /compact-session

If the session becomes too large despite these rules:
- Tell the user: "Session at capacity. Run /continue-sdlc from-<last-phase> in a new session."
- The checkpoints are on disk. A new session can resume by reading them.

Mandatory phases (each dispatched as a subagent, NOT inline):

1. Market research
2. Competitor analysis
3. USP definition
4. UX design phase (pre-build)
5. EPIC → Feature → Story backlog
6. Architecture review
7. Implementation plan
8. Build
9. Developer self-verification gate
10. Automated code regression gate
11. Browser UI regression gate
12. UX/HCI review
13. Code review gate
14. Security review
15. Traceability gap report
16. GitHub PR preparation
17. Release readiness report
18. Confluence artefact publishing

Phase dispatch template:

```
task(
  description="Phase <N>: <name>",
  prompt="Run the $ARGUMENTS phase for this story. Follow the usual workflow for this phase.
          Write a checkpoint to docs/product/traceability/checkpoints/<NN>-<name>.md
          Return DONE and the checkpoint file path when complete.",
  subagent_type=<appropriate agent>
)
```

Agent mapping for phases:
- Phase 1-2: market-researcher
- Phase 3-4: product-analyst
- Phase 5: story-writer
- Phase 6-7: architect
- Phase 8: backend-dev or frontend-dev
- Phase 9: backend-dev or frontend-dev
- Phase 10-11: test-engineer
- Phase 12: ux-reviewer
- Phase 13: code-reviewer
- Phase 14: security-reviewer
- Phase 15: traceability-recorder
- Phase 16-17: release-manager
- Phase 18: confluence-writer

Blocking quality gate rules:

- Build is not complete until developer self-verification, automated code regression, browser UI regression, and UX evidence gates have passed or have a documented genuine blocker.
- For UI-affecting stories, browser validation must happen before code review and before PR preparation.
- Authorization consistency is mandatory for any story affecting protected UI, protected routes, privileged actions, tenancy, auth, or permission-based behavior. The relevant subagents must verify parity across UI visibility, route/page guards, and API/middleware/service enforcement, and prove that authorized actors succeed, unauthorized actors fail, and privileged/system actors behave according to product intent.
- If typecheck, lint, unit, integration, build, e2e, browser, accessibility, content, navigation, auth, or authorization validation fails, return to the implementation agent to fix the issue, then rerun the failed gate and any dependent regression checks.
- Do not continue to code review, security review, traceability sign-off, GitHub PR preparation, release readiness, or Confluence publishing while a blocking product defect remains open.
- A `Pass with Conditions` can continue only when the condition is non-blocking, explicitly risk-accepted, linked to Jira `$JIRA_PROJECT_KEY`, and documented in the checkpoint.
- Environment/tool failures must be separated from product defects.

Authorization Consistency Gate:

- For any story affecting role-, permission-, actor-type-, tenant-, auth-, or authorization-based behavior, the build, regression, browser, and security phases must confirm:
  - the UI visibility/navigation rule,
  - the route/page guard rule,
  - the API/middleware/service authorization rule,
  - authorized actor success,
  - unauthorized actor denial,
  - privileged/system actor behavior matching product intent.
- If any layer disagrees, the SDLC run fails and must return to implementation before code review, PR preparation, or release readiness.

Final response only after:
- all phases are complete, or
- a genuine blocker is reached.

Final response must include ONLY:
- phases completed
- checkpoint paths
- blockers (if any)
- next recommended action

Do NOT re-list phase outputs. They are in checkpoint files.
