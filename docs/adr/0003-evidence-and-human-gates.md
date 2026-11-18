# 0003. Evidence-gated phases and human sign-offs

## Status
Accepted

## Context
Autonomous agents tend to move on after a phase whether or not it succeeded, and some
decisions (design direction, architecture, accepting a release) should not be delegated.

## Decision
- A phase is complete only when its artefact exists. Quality phases (regression, browser UI,
  UX, code review, security, traceability) block on findings and route failures to a fix loop
  classified by cause.
- Three gates require a human to tick APPROVE with a name and date in a sign-off file: design
  review, architecture sign-off and UAT. The orchestrator reads the file and stops otherwise.
- The traceability server links research → EPIC → feature → story → code → test → release and
  reports gaps before a PR is opened.

## Consequences
- Slower than an ungated agent, by design.
- Reviewers get a complete audit trail in the PR.
- Gate rules live in `AGENTS.md`, so teams can tune them without code changes.
