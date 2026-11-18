## Task: Pull Request Full Stack Review

### Input
PR diff, changed files, or branch delta in a TypeScript monorepo

### Steps
1. Identify changed surfaces (apps, packages, data, docs, infra).
2. Identify affected packages and contract boundaries.
3. Verify behavior against story/requirement intent.
4. Review TypeScript safety: strictness regressions, unsafe `any`, runtime/schema mismatch.
5. Review security: auth, authorization, validation, secrets exposure.
6. Review reliability/performance: error paths, retries, timeouts, resource usage.
7. Review data implications: schema changes, migration safety, rollback impact.
8. Review test coverage (unit/integration/e2e/contract) and missing critical tests.
9. Run default command checklist for affected packages (`typecheck`, `lint`, `test`, `build`) and capture failures.
10. Review documentation and traceability updates where required.
11. Produce severity-ranked findings and merge decision.

---

## Task: Story Readiness Code Review

### Input
Story IDs and implementation changes

### Steps
1. Read story context from the configured Jira project (`JIRA_PROJECT_KEY`) via Atlassian MCP.
2. Compare implementation behavior to acceptance criteria.
3. Validate permissions/scope behavior and audit expectations.
4. Confirm test evidence covers main, alternate, and failure paths.
5. Confirm cross-package contract compatibility (shared types/API schemas).
6. Run affected-package validation commands (`typecheck`, `lint`, `test`, `build`).
7. Confirm docs in `docs/07_system_design/*` and related packs are synchronized.
8. Output blocking gaps and exact file-level fixes.

---

## Task: Security and Compliance Focused Review

### Input
Changed code for sensitive flows

### Steps
1. Trace trust boundaries and user-controlled inputs.
2. Check authentication, authorization, and tenant/organisation scoping.
3. Check PII/legal/regulatory data handling, logging, and audit trails.
4. Validate secure defaults, error messaging, and abuse-case handling.
5. Check shared package leaks of sensitive fields across app/API boundaries.
6. Run `typecheck` and targeted security-sensitive tests for affected packages.
7. Report compliance or data protection risks with severity.

---

## Task: Monorepo Contract Drift Review

### Input
Changes touching shared types, API schema, validators, or SDK packages

### Steps
1. Identify source-of-truth contracts (schema/type definitions).
2. Verify downstream consumers compile and align semantically.
3. Check request/response and DTO compatibility across app and API.
4. Validate versioning strategy for breaking vs non-breaking changes.
5. Confirm contract tests or integration tests cover changed boundaries.
6. Run compile/build checks for all directly impacted consumer packages.
7. Report drift risks and required fixes by package/file.
