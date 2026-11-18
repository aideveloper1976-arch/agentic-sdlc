## Task: PR Full Stack Test Review

### Input
PR diff, acceptance criteria, affected packages

### Steps
1. Map changed files to impacted user flows and service boundaries.
2. Validate acceptance criteria against implementation behavior.
3. Run focused typecheck/lint/unit/integration/e2e for affected scope.
4. For UI changes, run browser validation against changed flows and relevant global UI regression matrix journeys.
5. For UI changes, validate content, navigation, role visibility, protected routes, form validation, loading/empty/error states, responsive behavior, screenshots, and accessibility.
6. Review failing tests and classify root cause (product bug vs test bug vs fixture/data issue vs env issue).
7. Identify missing coverage for edge/error/authorization paths.
8. Record severity-ranked findings and final decision.
9. Save/update `docs/Test Reviews/YYYYMMDD_Test_Review.md`.

---

## Task: Regression Sweep After Refactor

### Input
Refactor branch and impacted modules

### Steps
1. Identify moved/renamed contracts and cross-package dependencies.
2. Re-run targeted regression suites and critical-path e2e scenarios.
3. Execute browser journeys from `docs/09_jira_pack/Test_Scripts/global-ui-regression-matrix.md` that touch changed modules.
4. Validate backward compatibility where APIs or schemas changed.
5. Check flaky-test indicators (order dependence, timing assumptions, shared state leaks).
6. Capture regressions and mitigation/fix plan.
7. Save results to `docs/Test Reviews/YYYYMMDD_Test_Review.md`.

---

## Task: Release Readiness Gate

### Input
Release candidate branch and environment assumptions

### Steps
1. Verify critical business journeys and auth-sensitive flows.
2. Run high-confidence suites, smoke tests, and browser regression against the global UI regression matrix.
3. Confirm observability for failure diagnosis (logs/metrics/traces where applicable).
4. Validate rollback and data-safety assumptions for changed components.
5. Classify remaining risk and assign required pre-release actions.
6. Save final gate report in `docs/Test Reviews/YYYYMMDD_Test_Review.md`.
7. Issue `Pass`, `Pass with Conditions`, or `Fail`.
