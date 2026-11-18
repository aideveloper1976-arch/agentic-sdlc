---
name: github-pr-management
description: Manage branch publish, PR creation, checks review, and merge-readiness updates with Jira linkage.
---

# GitHub PR Management

## Goal
Own the GitHub phase between code commit and release readiness.

## System of Record
- Jira project: `$JIRA_PROJECT_KEY` for workflow status and PR trace links.
- Confluence space: `PROD` only when a long-form PR review summary is required.

## Workflow
1. Validate branch and diff scope.
2. Push branch and create PR.
3. Add Story/Feature links and evidence references.
4. Check CI/check statuses and blocking reviews.
5. Update Jira issue(s) in the configured Jira project with PR link and gate status.
6. Write phase checkpoint in `docs/product/traceability/checkpoints`.

## Required Output
## PR Link
## Checks Summary
## Jira Update Summary
## Merge Readiness

## Rules
- Do not merge with unresolved blocking checks.
- Do not skip linking PR to Jira items.
