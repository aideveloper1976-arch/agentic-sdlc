# Full Stack Git Commit Tracker Skill - Quickstart

## Purpose
Use this skill to convert tracking-log updates into changelog entries and create traceable git commits.

## Typical Usage

### 1) Commit latest tracked work
```text
Use fullstack-git-commit-tracker.
Extract updates from latest docs/dev_practice/tracking/*_tracking.md,
append changelog entry, stage related files, and create commit.
```

### 2) Commit for a specific tracking date
```text
Use fullstack-git-commit-tracker for 20260403.
Extract from docs/dev_practice/tracking/20260403_tracking.md and commit with changelog update.
```

### 3) Reconcile changelog before PR
```text
Use fullstack-git-commit-tracker to reconcile missing changelog entries from tracking files, then commit docs updates.
```

## Required Files
- Tracking source: `docs/dev_practice/tracking/*_tracking.md`
- Changelog target: `docs/dev_practice/tracking/CHANGELOG.md`

## Expected Output
- Extraction summary from tracking files.
- Updated changelog entry.
- Commit hash, message, and post-commit status.
