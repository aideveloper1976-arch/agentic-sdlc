# The delivery lifecycle

`/run-full-sdlc` drives a feature through the phases below. The authoritative rules live in
[`framework/AGENTS.md`](../framework/AGENTS.md), which the orchestrator loads as instructions;
this page is the readable summary.

## Phases, owners and exit evidence

| # | Phase | Agent | Exit evidence (checkpoint or artefact) | Gate |
|---|---|---|---|---|
| 0 | Knowledge graph (optional) | `architect` | `graphify` code graph for impact analysis | – |
| 1 | Market research | `market-researcher` | research brief with sources | – |
| 2 | Competitor analysis | `market-researcher` | comparison matrix with verdicts | – |
| 3 | USP and requirements | `product-analyst` | USP, personas, FRs/NFRs, risks, non-goals | – |
| 4 | EPIC → Feature → Story | `story-writer` | backlog with acceptance criteria, synced to Jira; UAT journey map | – |
| 5 | UX design (pre-build) | `ui-designer` | screen designs, component tree, accessibility plan; `STITCH_DESIGN_REVIEW.md` | **Human: design approval** |
| 6 | Architecture review | `architect` | data model, API contracts, ADRs; `ARCHITECTURE_SIGN_OFF.md` | **Human: architecture approval** |
| 7 | Implementation plan | `architect` | build order, exact files, dependencies | – |
| 8 | Build | `backend-dev`, `frontend-dev` | code + tests (TDD), wired into navigation | – |
| 9 | Developer self-verification | build agents | touched paths verified, failures fixed | – |
| 10 | Automated code regression | `test-engineer` | typecheck, lint, build, unit, integration, API results | blocks on defects |
| 11 | Browser UI regression | `test-engineer` | real-browser run of changed flows, screenshots, a11y scan, persisted test script | blocks on defects |
| 12 | UX/HCI review | `ux-reviewer` | usability and accessibility findings from runtime evidence | blocks on defects |
| 13 | Code review gate | `code-reviewer` | structured review; blocking issues go back to build | blocks on findings |
| 14 | Security review | `security-reviewer` | dependency, secret, code, API and container scan results | blocks on findings |
| 15 | Traceability gap report | `traceability-recorder` | trace report linking each story to code, tests, evidence | blocks on gaps |
| 16 | UAT | `test-engineer` | journeys executed end to end; `UAT_SIGN_OFF.md` | **Human: UAT approval** |
| 17 | GitHub PR | `release-manager` | branch, commit, PR with linked issues and evidence | – |
| 18 | Release readiness | `release-manager` | ship decision, rollout steps, risk assessment | – |
| 19 | Confluence publishing | `confluence-writer` skill | release artefacts published | – |

Phases that don't apply are recorded as N/A rather than skipped silently (for example, UAT on a
backend-only change).

## Rules that make the gates real

- **No phase is "done" without its artefact on disk.** The orchestrator only records
  `Phase N done → <path>`, so a missing checkpoint is visible.
- **Fix loops route by cause.** A UAT failure is classified as a product defect (back to the
  build agents), a design gap (UX reviewer or architect) or a requirements gap (product analyst
  then story writer), and downstream gates re-run after the fix.
- **Browser evidence is mandatory for UI changes.** Source-only review cannot pass phases 11
  or 12.
- **Human gates stop the run.** The orchestrator reads the sign-off file and will not continue
  until a reviewer has ticked APPROVE with a name and date.

## Run folder layout

```text
docs/sdlc-runs/<yyyy-mm-dd>-<slug>/
├── CONTEXT.md                  scope, decisions, current phase
├── checkpoints/                01-market-research.md … 19-…
├── STITCH_DESIGN_REVIEW.md     design gate
├── ARCHITECTURE_SIGN_OFF.md    architecture gate
├── uat-journey-map.md
└── uat-evidence/UAT_SIGN_OFF.md
```

## Lighter-weight paths

| Command | Phases it runs |
|---|---|
| `/build-story` | 8 → 15 for one existing story |
| `/fix-issue` | systematic debugging → failing test → fix → verification → full test suite → commit |
| `/quick-change` | implement → verify → commit, for small UI or UAT feedback items |
| `/discover-and-write-backlog` | 1 → 4 |
