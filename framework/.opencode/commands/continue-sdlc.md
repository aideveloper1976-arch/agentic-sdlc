---
description: Resume SDLC workflow from a specific phase after session capacity was reached
agent: master-orchestrator
---

Resume the SDLC workflow from a specified phase. All previous phase outputs are on disk
in checkpoint files. Read them to understand context, then continue from the given phase.

Usage: /continue-sdlc from-<phase-number>

Example: /continue-sdlc from-7
  → Reads checkpoints for phases 1-6 from disk
  → Starts executing from phase 7 (Implementation plan)

## Resume process

1. Read all existing checkpoint files from docs/product/traceability/checkpoints/
2. Determine what was completed and what's pending
3. Start executing from the specified phase
4. Follow the normal SDLC workflow for remaining phases
5. Use the subagent dispatch pattern (keep orchestrator context minimal)

## Phase mapping

| Phase | Name | Agent |
|-------|------|-------|
| 1 | Market research | market-researcher |
| 2 | Competitor analysis | market-researcher |
| 3 | USP definition | product-analyst |
| 4 | UX design (pre-build) | product-analyst |
| 5 | EPIC → Feature → Story | story-writer |
| 6 | Architecture review | architect |
| 7 | Implementation plan | architect |
| 8 | Build | backend-dev / frontend-dev |
| 9 | Developer self-verification | backend-dev / frontend-dev |
| 10 | Automated code regression | test-engineer |
| 11 | Browser UI regression | test-engineer |
| 12 | UX/HCI review | ux-reviewer |
| 13 | Code review gate | code-reviewer |
| 14 | Security review | security-reviewer |
| 15 | Traceability gap report | traceability-recorder |
| 16 | GitHub PR preparation | release-manager |
| 17 | Release readiness report | release-manager |
| 18 | Confluence artefact publishing | confluence-writer |

## Context management

- Read checkpoint files for prior phases (do NOT ask the user to recap)
- Dispatch remaining phases as subagents (keep orchestrator context minimal)
- Each phase: dispatch → subagent writes checkpoint → return "DONE"
- Orchestrator records: "Phase N done → <path>" and continues
