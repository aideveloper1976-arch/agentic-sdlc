# Full Stack Tester Reviewer Skill - Quickstart

## Purpose
Use this skill to run a structured full stack testing and review pass, then return a ship/no-ship decision with actionable fixes.

## Typical Usage

### 1) Pre-merge validation
```text
Use fullstack-tester-reviewer on this PR.
Validate acceptance criteria and run focused frontend, backend, integration, and e2e checks.
Return blocking findings first.
```

### 2) Release gate
```text
Use fullstack-tester-reviewer for release readiness.
Focus on auth flows, payment/critical paths, data integrity, and rollback confidence.
```

### 3) Regression sweep
```text
Use fullstack-tester-reviewer for a regression pass after this refactor.
Prioritize shared contracts, error paths, and concurrency-sensitive flows.
```

## Expected Output
- Coverage summary by layer and feature area.
- Severity-ranked findings with file-level references.
- Required remediations and optional improvements.
- Final decision: `Pass`, `Pass with Conditions`, or `Fail`.

## Default Command Checklist (adapt to repo)
1. Install integrity
```bash
pnpm install --frozen-lockfile
```

2. Type and lint safety
```bash
pnpm -r --filter "<affected>" typecheck
pnpm -r --filter "<affected>" lint
```

3. Unit and integration confidence
```bash
pnpm -r --filter "<affected>" test
```

4. E2E confidence
```bash
pnpm -r --filter "<affected>" e2e
```

5. Build and package integrity
```bash
pnpm -r --filter "<affected>" build
```

If using `turbo` or `nx`, run equivalent affected commands and map failures to finding severity.
