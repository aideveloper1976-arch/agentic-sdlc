# 0001. One subagent per phase, checkpoints on disk

## Status
Accepted

## Context
A full feature run touches research, backlog, design, architecture, build, several test and
review gates, and release. Run inside a single agent, the transcript outgrows the context
window long before the PR, and compaction drops detail the later phases need.

## Decision
The orchestrator never does phase work itself. For each phase it dispatches a fresh subagent
with the phase instructions. The subagent writes a checkpoint file to
`docs/sdlc-runs/<run>/checkpoints/` and returns only `DONE <path>`. The orchestrator records a
single line per phase. Later phases read earlier checkpoints from disk when they need them.

## Consequences
- A full run fits in one orchestrator session; `/continue-sdlc` can resume in a new one.
- Every phase leaves a durable, reviewable artefact.
- Subagents start cold, so phase instructions and checkpoints must be self-contained. This is
  enforced by the phase rules in `AGENTS.md`.
