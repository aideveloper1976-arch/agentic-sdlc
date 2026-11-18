---
name: epic-feature-story-writing
description: Create delivery-ready backlog items in EPIC to Feature to Story form with acceptance criteria and traceability.
---

# Epic Feature Story Writing

## Goal
Turn validated product scope into backlog items that are implementation-ready, traceable, and specific enough to build without guessing.

## System of Record
- Jira project: `$JIRA_PROJECT_KEY` for EPIC/Feature/Story hierarchy and acceptance criteria.
- Confluence space: `PROD` for supporting decomposition narrative when needed.

## When to Use
- Breaking down research or requirements into delivery units.
- Refining backlog scope before architecture or implementation starts.
- Rewriting vague Jira items into buildable stories.

## Required Inputs
- Research, requirements, or feature intent.
- Scope boundaries and known constraints.
- Any existing EPIC, Feature, or Story identifiers.

## Workflow
1. Confirm the hierarchy and missing upstream context.
2. Draft or update the EPIC with outcome and success metrics.
3. Define Features with scope, requirements, dependencies, and risks.
4. Write Stories with acceptance criteria, edge cases, and implementation notes.
5. Link each Story back to its Feature and EPIC.
6. Sync EPICs/Features/Stories to the configured Jira project (`JIRA_PROJECT_KEY`) using `traceability_sync_to_jira`.
7. Write phase checkpoint in `docs/product/traceability/checkpoints`.

## Template-First Execution Rule
To avoid agent timeouts when generating large backlogs (5+ EPICs, 30+ stories):

1. **First pass — write structure to file.** Use the `Write` tool to create the backlog file with EPIC/Feature/Story IDs, titles, estimates, and priorities only. This is fast and establishes the skeleton.
2. **Second pass — fill acceptance criteria per EPIC.** For each EPIC, launch a sub-task to generate the GIVEN/WHEN/THEN acceptance criteria for its stories only. One EPIC per call. This keeps each agent call under the timeout.
3. **Final pass — sync to Jira.** Once the backlog file is complete, create the corresponding items in the configured Jira project (`JIRA_PROJECT_KEY`) using `atlassian_createJiraIssue` or `traceability_sync_to_jira`.

Never attempt to generate all EPICs + all Features + full story acceptance criteria in a single agent call. Break it into EPIC-sized chunks.

## Mandatory Hierarchy
Use exactly:

EPIC
-> Feature
-> Story

## EPIC Must Include
- EPIC ID
- title
- business outcome
- target user or persona
- linked research
- success metrics

## Feature Must Include
- Feature ID
- objective
- in scope
- out of scope
- functional requirements
- non-functional requirements
- dependencies
- risks
- UX considerations
- security or privacy considerations
- observability considerations
- linked EPIC
- linked evidence

## Story Must Include
- Story ID
- title
- goal
- description
- acceptance criteria
- edge cases
- backend notes
- frontend notes
- data impact
- test notes
- UX notes
- security notes
- traceability links

## Rules
- Use Given / When / Then for acceptance criteria where practical.
- Include negative paths and edge cases.
- Avoid vague stories that omit system detail.
- Flag missing information as open questions instead of guessing.
