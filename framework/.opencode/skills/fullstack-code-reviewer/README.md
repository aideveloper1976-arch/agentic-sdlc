# Full Stack Code Reviewer Skill (TypeScript Monorepo) - Quickstart

## Purpose
Use this skill to run a structured full stack review in TypeScript monorepos and produce a clear merge decision with actionable file-level fixes.

## Typical Usage

### 1) Review a PR before merge
```text
Use fullstack-code-reviewer on this PR.
Review frontend, backend, shared packages, auth, tests, and docs.
Return severity-ranked findings and a merge decision.
```

### 2) Validate a Jira story implementation
```text
Use fullstack-code-reviewer for STORY-1804.
Compare code changes with acceptance criteria and authorization requirements.
List blocking issues first.
```

### 3) Security-focused pass
```text
Use fullstack-code-reviewer for a security and compliance review.
Prioritize authz, data handling, audit trail, and error-path leakage.
```

### 4) Contract drift pass
```text
Use fullstack-code-reviewer for monorepo contract drift review.
Focus on shared types/schemas, DTO compatibility, and affected package risks.
```

## Expected Output
- Review summary and decision.
- Findings table with severity and fix guidance.
- Required changes vs suggested improvements.
- Test and documentation alignment notes.
- Monorepo impact notes (affected packages, contract drift, build graph risk).

## Default Command Checklist (TypeScript Monorepo)
Run these for the affected apps/packages first, then expand repo-wide if risk is high:

1. Dependency/install integrity
```bash
pnpm install --frozen-lockfile
```

2. Type safety
```bash
pnpm -r --filter "<affected>" typecheck
```

3. Lint quality
```bash
pnpm -r --filter "<affected>" lint
```

4. Test confidence
```bash
pnpm -r --filter "<affected>" test
```

5. Build integrity
```bash
pnpm -r --filter "<affected>" build
```

If the repo uses `turbo` or `nx`, use the equivalent affected commands:
```bash
pnpm turbo run typecheck lint test build --filter=<affected>
pnpm nx affected -t typecheck,lint,test,build
```

Record command failures and map each failure to finding severity in the review output.
