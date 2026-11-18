---
name: fullstack-solution-architect
description: Produce implementation-ready system design, API contracts, state flows, and developer handoff guidance.
---

# Full Stack Solution Architect

## Goal
Transform story scope into developer-ready system design documentation aligned to current implementation reality, authorization rules, and delivery risks.

## System of Record
- Jira project: `$JIRA_PROJECT_KEY` for story status and design linkage.
- Confluence space: `PROD` for architecture and design artefacts.

## When to Use
- Before implementation starts on a new story.
- When system design docs must be reconciled after build.
- When API, state, auth, or data boundaries are changing.

## Required Inputs
- Jira story scope and acceptance criteria.
- Existing `docs/07_system_design/*` context.
- Relevant code and architecture context from the repo.

## Workflow
1. Read the story scope, dependencies, and technical constraints.
2. Map scope to impacted APIs, services, pages, flows, and data models.
3. Update the relevant `docs/07_system_design/*` artifacts.
4. Document authorization, organisation-scope, sensitivity, and audit expectations.
5. Publish/update architecture artefact in Confluence (`PROD`) and link it in Jira.
6. Produce build-readiness or post-build reconciliation notes.
7. Add phase checkpoint in `docs/product/traceability/checkpoints`.

## Required Output
## System Design Update Summary
## API Contract Section
## Build Readiness Checklist
## Post-Build Reconciliation Checklist

## Rules
- Keep docs aligned to actual code contracts, not idealized future state.
- Make failure paths, auth constraints, and data sensitivity explicit.
- Leave enough detail that engineers can start without blocking questions.
