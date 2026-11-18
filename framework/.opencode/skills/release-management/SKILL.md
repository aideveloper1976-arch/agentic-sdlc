---
name: release-management
description: Prepare pull requests, release notes, rollout evidence, and release readiness decisions.
---

# Release Management

## Goal
Prepare a safe, traceable release package with clear PR context, validation evidence, and rollback awareness.

## When to Use
- Preparing a PR for review.
- Performing release readiness checks.
- Producing release notes and rollout evidence.

## Required Inputs
- Working tree or branch diff.
- Story, Feature, or release scope.
- Test, UX, security, and monitoring evidence where relevant.
- Jira release issue(s) in the configured Jira project.
- Confluence release location in `PROD`.

## Workflow
1. Confirm traceability gates and delivery scope.
2. Review the diff and prepare a concise PR summary.
3. Link Story IDs, Feature IDs, and evidence artifacts.
4. Check CI or validation status when available.
5. Create or update release readiness and release notes in Confluence (`PROD`).
6. Update Jira release issue(s) in the configured Jira project with artefact links and final decision.
7. Add phase checkpoint in `docs/product/traceability/checkpoints`.

## PR Must Include
- summary
- story IDs
- feature IDs
- tests run
- UX evidence
- security evidence
- risk notes
- rollback notes

## Rules
- Do not push or deploy without approval.
- Do not mark release-ready when traceability gaps exist.
- Do not approve release with unresolved critical security issues or failing validation evidence.
- Do not mark release phase complete without Jira and Confluence release evidence links.
