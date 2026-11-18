---
name: fullstack-code-reviewer
description: Perform structured code reviews across application, shared-package, test, and documentation changes.
---

# Full Stack Code Reviewer

## Goal
Review a delivery unit for correctness, type safety, test quality, contract drift, performance risk, security issues, and release readiness.

## When to Use
- Before merging a pull request.
- After implementing medium or high-risk changes.
- When validating that code matches story scope and design expectations.

## Required Inputs
- Changed files or PR diff.
- Acceptance criteria, story scope, or design expectations.
- Workspace config and build/test context when relevant.

## Workflow
1. Understand the intended change and affected boundaries.
2. Review correctness, failure modes, and regression risk.
3. Check types, contracts, tests, docs, and build graph impact.
4. Check for unnecessary code (Minimal-Code Ladder, adapted from Ponytail): unrequested abstractions, boilerplate, new dependencies that duplicate stdlib/existing utils, or a fix that patches a symptom instead of the shared root cause. Raise as a Suggested Improvement unless the excess code itself introduces a correctness, security, or maintainability risk, in which case raise it as a Required Fix.
5. Rank findings by severity and explain why they matter.
5. Return a clear merge recommendation.

## Required Output
## Review Summary
## Findings
## Required Fixes
## Suggested Improvements
## Test / Build Risk
## Final Decision

## Rules
- Findings come first and should be evidence-backed.
- Prefer file-level, actionable feedback.
- Distinguish blocking issues from optional improvements.
- Include cross-package or shared-contract risk when relevant.
- Verify changed code against the relevant development standard in `docs/product/standards/`. Flag any deviation as a required fix.
- If a code change introduces a pattern that conflicts with a standard, raise it as a required fix with a recommendation to update the standard file.

### Dependency Vulnerability Rules (Phase 13 gate)
- **Verify Phase 10 passed**: Check that automated code regression (Phase 10) ran `npm audit --audit-level=high` successfully with zero high/critical vulnerabilities. If Phase 10 was skipped or failed, this is a Required Fix — do not approve the code review.
- **Review lock file changes**: Examine package-lock.json and pnpm-lock.yaml changes for unexpected transitive dependencies or suspicious version jumps. Flag if unfamiliar or high-risk dependencies appear.
- **Justification for new dependencies**: For each new direct dependency in package.json, verify the commit message or PR description explains why it was added. Reject if missing justification.
- **No duplicate dependencies**: If new code adds a dependency that duplicates an existing stdlib function or already-present package, flag as a Required Fix (bloats attack surface and maintenance burden).
