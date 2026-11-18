---
name: fullstack-tester-reviewer
description: Run structured full-stack validation across test layers and return a clear ship decision with evidence.
---

# Full Stack Tester Reviewer

## Goal
Validate implemented behavior against acceptance criteria, detect regressions and test gaps, and provide a clear release-readiness decision.

## System of Record
- Jira project: `$JIRA_PROJECT_KEY` for pass/fail and issue linkage.
- Confluence space: `PROD` for test evidence artefacts.

## When to Use
- Before merging medium or high-risk changes.
- Before release candidate sign-off.
- After cross-package refactors or shared-schema changes.

## Required Inputs
- PR diff or changed files.
- Acceptance criteria or story context.
- Test environment assumptions and existing reports when available.

## Workflow
1. Identify impacted layers and critical flows.
2. Run or assess the relevant typecheck, lint, unit, integration, API, e2e, and build signals.
3. For this monorepo, prefer `npm run check-types`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`, and package-specific equivalents when scope is narrower.
4. **Run dependency vulnerability scan:** Execute `npm audit --audit-level=high` at monorepo root and each affected app/package directory. **FAIL immediately if high/critical vulnerabilities are found** — return to implementation for remediation before proceeding to code review.
5. For UI changes, run real browser-based validation using browser automation tools against the actual app.
5. Execute the changed feature's happy path, meaningful negative/validation paths, auth/authorization checks, and the global UI regression matrix in `docs/09_jira_pack/Test_Scripts/global-ui-regression-matrix.md`.
6. Validate page content, headings, CTA text, data states, form validation, loading/empty/error states, role-based navigation visibility, protected route behavior, and desktop/tablet/mobile responsiveness.
7. Capture screenshots of key screens/states and run an in-browser accessibility scan.
8. Persist a durable UI test script artifact for UI changes, recording the exact browser steps and expected outcomes.
9. Separate product bugs, test-suite issues, fixture/data issues, and environment failures.
10. Rank findings by severity and evidence.
11. If a blocking product defect exists, return `Fail` and require remediation before code review or PR preparation.
12. Publish/update test evidence artefact in Confluence (`PROD`).
13. Update Jira story/release item in the configured Jira project with decision and links.
14. Add phase checkpoint in `docs/product/traceability/checkpoints`.
15. Return a final decision.

## Required Output
## Test Review Summary
## Layer Status Matrix
## Findings Table
## Required Remediations
## Conditional Follow-ups

## Rules
- Every finding must include direct evidence.
- Verify tests follow `docs/product/standards/09-testing.md` — flag E2E auth violations, missing coverage, or incorrect patterns.
- If a testing pattern has changed (e.g., new test framework, new E2E auth approach, updated coverage standard), update `docs/product/standards/09-testing.md` before closing the test phase.

### Dependency Vulnerability Rules (Phase 10 gate)
- **HIGH/CRITICAL vulns = IMMEDIATE FAIL**: Do not pass this phase if `npm audit --audit-level=high` finds vulnerabilities. Flag as blocking. Return to implementation.
- **MODERATE vulns = DOCUMENT & FLAG**: Log all moderate vulnerabilities. Do not fail the build, but inform Phase 14 (Security Review) for exploitability assessment.
- **Lock file verification**: Review package-lock.json and pnpm-lock.yaml for unexpected transitive dependency changes or version surprises.
- **New dependency justification**: Verify all new dependencies added in this story are justified in the commit message or PR description.
- UI changes require browser-based validation evidence unless a genuine blocker exists.
- UI validation is not complete until the agent has attempted: build/typecheck, happy-path flow execution, screenshot capture, and in-browser accessibility scanning.
- UI validation is not complete until the agent has also produced a persisted UI test script artifact in `docs/09_jira_pack/Test_Scripts/` or an equivalent executable test file.
- UI validation is not complete until the global UI regression matrix has been executed or scoped exclusions have been listed with rationale.
- Browser validation must assert content correctness, role-based navigation, protected route behavior, form validation, loading/empty/error states, and responsive behavior for impacted areas.
- Missing browser evidence for a UI-affecting story is a `Fail`, not a conditional pass, unless a genuine environment/tool blocker is documented with remediation attempts.
- Do not allow code review, PR preparation, release readiness, or Confluence release publishing to proceed while a blocking product defect remains open.
- If the browser pass cannot run, the report must clearly distinguish environment blockers from product defects.
- Do not hide release-blocking issues inside generalized summaries.

## Minimum Browser Evidence For UI Changes
- One happy-path browser flow covering the primary user journey.
- Meaningful negative-path or validation checks for forms, permissions, or invalid states where relevant.
- One screenshot per key screen or state changed by the work.
- One in-browser accessibility scan with violations and severities.
- Auth and authorization checks for protected routes or role-gated actions.
- Desktop, tablet, and mobile viewport checks for the changed experience.
- Evidence that relevant existing journeys from the global UI regression matrix still pass.
- One persisted UI test script artifact documenting the exact steps, expected results, and evidence links.
- Saved evidence artifacts that can be linked from Jira, Confluence, and traceability.

## UI Test Script Artifact Requirements
- Save the script under `docs/09_jira_pack/Test_Scripts/` when practical.
- Use a stable name tied to the delivery item, for example `TS-PROJ-202-risk-questionnaire-wizard.md`.
- Include:
  - objective and scope,
  - prerequisites and test data,
  - happy-path steps,
  - negative-path or validation checks,
  - auth/authorization checks for protected flows,
  - expected result for each step,
  - links or references to screenshots, reports, and accessibility evidence.
