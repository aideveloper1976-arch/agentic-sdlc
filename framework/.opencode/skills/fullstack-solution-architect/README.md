# Full Stack Solution Architect Skill - Quickstart

## Purpose
Use this skill to convert Jira stories into developer-ready system design docs under `docs/07_system_design/*`.

## Typical Usage

### 1) Prepare design docs before build
Prompt example:

```text
Use fullstack-solution-architect for STORY-1806.
Update docs/07_system_design so implementation can start immediately.
Include API contracts, auth/scope rules, state/flow updates, data sensitivity, and dev handoff.
```

### 2) Reconcile docs after build
Prompt example:

```text
Use fullstack-solution-architect for STORY-1806 post-build reconciliation.
Compare implementation with docs/07_system_design and update API_Catalog, flow/state docs, and handoff notes.
```

### 3) Multi-story planning pass
Prompt example:

```text
Use fullstack-solution-architect for STORY-1805, STORY-1806, and STORY-1807.
Produce a build readiness pass and list any architecture risks still open.
```

## Expected Output
- Updated files in `docs/07_system_design/*`
- Clear API calling format updates in `docs/07_system_design/API_Catalog.md`
- Build readiness checklist and remaining risks

## Minimum Inputs to Provide
- Story ID(s)
- Scope boundaries (if partial)
- Build phase (`before build` or `after build`)
