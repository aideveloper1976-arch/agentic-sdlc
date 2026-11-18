---
name: traceability-validation
description: Validate complete lifecycle traceability from idea and research through build, test, release, and monitoring.
---

# Traceability Validation

## Goal
Ensure every delivery increment has a complete audit trail across the required lifecycle chain.

## When to Use
- Before declaring a story or release complete.
- During release readiness checks.
- When auditing gaps across backlog, implementation, and evidence artifacts.

## Required Inputs
- Target story, feature, release, or traceability entity.
- Available upstream and downstream artifact references.
- Any known exceptions or waived gates.

## Workflow
1. Retrieve the current trace chain.
2. Check required upstream and downstream links.
3. Flag missing acceptance criteria or missing evidence.
4. Summarize gaps, required fixes, and release impact.

## Required Chain
Idea
-> Research
-> EPIC
-> Feature
-> Story
-> Code Change
-> Jira Story Update
-> Confluence Implementation Evidence
-> Test Evidence
-> UX Evidence if UI
-> Security Evidence if sensitive
-> PR
-> Release
-> Monitoring Evidence

## Gap Checks
Flag:
- EPIC without research
- Feature without EPIC
- Story without Feature
- Story without acceptance criteria
- Story without tests
- UI story without UX review
- security-sensitive story without security review
- release without PR
- release without monitoring evidence
- story without Jira issue updates in the configured Jira project
- evidence phase without Confluence artefact in `PROD`
- missing phase checkpoint in `docs/product/traceability/checkpoints`

## Required Output
## Traceability Status
## Complete Links
## Missing Links
## Gaps
## Required Fixes
## Release Readiness

## Rules
- Use the traceability tools instead of manual assumptions when possible.
- Do not mark work complete if required links are missing.
- Validate both Jira links and Confluence artefact links for each evidence-bearing phase.
