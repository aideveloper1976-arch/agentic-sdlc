---
description: Build, test, review, secure, and trace a single story
agent: master-orchestrator
---

Build this story:

$ARGUMENTS

Required workflow:

1. Load story and linked Feature/EPIC.
2. Validate acceptance criteria.
3. Invoke architect if needed.
4. Implement backend/frontend changes.
5. Run developer self-verification for touched code paths.
6. Run automated code regression: typecheck, lint, unit, integration/API, and build checks relevant to the changed scope.
7. For UI-affecting stories, run browser UI regression before considering development complete.
8. For UI-affecting stories, execute the global UI regression matrix in `docs/09_jira_pack/Test_Scripts/global-ui-regression-matrix.md` or document any scoped exclusions.
9. For UI-affecting stories, capture screenshots, accessibility results, browser flow logs, content checks, responsive checks, and a persisted UI test script artifact.
10. If any code, browser, UX, accessibility, auth, authorization, navigation, content, or regression check fails, return to implementation, fix the defect, and rerun the failed gate plus dependent regression checks.
11. Run UX review if UI is affected. UX review must consume runtime browser evidence or fail as incomplete.
12. Run code review gate only after code and browser regression gates pass.
13. Run security review if sensitive.
14. Save evidence.
15. Update traceability.
16. Prepare PR summary only when no blocking gate remains open.

Blocking completion rules:

- A story is not build-complete while a product defect is present in typecheck, lint, unit, integration/API, build, e2e, browser, accessibility, UX, auth, authorization, navigation, or content validation.
- Direct URL-only access is insufficient for new UI. Intended roles must discover the feature through the correct navigation surface, and unauthorized roles must not see or access it.
- `Pass with Conditions` requires explicit risk acceptance, Jira `$JIRA_PROJECT_KEY` linkage, and checkpoint documentation.
- Environment failures must be separated from product failures and may block completion if they prevent meaningful validation.

Return:
- files changed
- tests run
- UX results
- security results
- traceability links
- PR readiness
