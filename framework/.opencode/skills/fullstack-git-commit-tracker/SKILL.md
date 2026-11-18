---
name: fullstack-git-commit-tracker
description: Prepare commits with aligned tracking-log and changelog updates.
---

# Full Stack Git Commit Tracker

## Goal
Keep git history aligned with documented delivery work by turning tracking updates into safe, traceable commits.

## When to Use
- After updating delivery docs and tracking logs.
- Before opening a PR when changelog evidence is required.
- During end-of-day consolidation of documented work.

## Required Inputs
- Tracking files in `docs/dev_practice/tracking/*.md`.
- Current working tree or staged diff.
- Optional target date for extraction.

## Workflow
1. Review relevant tracking entries and related code or doc changes.
2. Update the normalized changelog if needed.
3. Stage only the relevant files.
4. Draft a commit message that reflects the documented work.
5. Create and verify the commit.

## Required Output
## Tracking Sources
## Files Staged
## Changelog Update
## Commit Summary

## Rules
- Never commit unrelated changes.
- Keep commit scope aligned to the documented delivery slice.
- Preserve traceability from tracking notes to changelog to commit.
