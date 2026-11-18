---
name: fullstack-typescript-developer
description: Implement production-grade TypeScript changes with strong type safety, testing, contract awareness, and documentation alignment.
---

# Full Stack TypeScript Developer

## Goal
Build the smallest correct implementation that satisfies approved scope, preserves system quality, and leaves clear verification evidence.

## When to Use
- Implementing new features, fixes, or refactors.
- Translating approved requirements and system design into code.
- Reconciling code, tests, and docs after scope changes.

## Required Inputs
- Story or task scope with acceptance criteria.
- Relevant design, API, and requirement context.
- Existing codebase behavior and repository constraints.

## Workflow
1. Read the existing code paths before editing.
2. Implement the minimal cohesive change that satisfies the scope.
3. For any new UI page/flow/major feature, wire it into the correct role-based navigation surface (System Admin, Organisation Admin, or Organisation User); direct URL-only access is incomplete.
4. Update tests, contracts, and docs where behavior changes.
5. Verify with targeted commands before handing off: typecheck, lint, tests, build, and package-specific commands relevant to the change.
6. For UI changes, run or request browser validation before marking implementation complete. Cover the changed flow, navigation discoverability, role visibility, validation errors, responsive behavior, content correctness, and key regressions.
7. If verification fails, fix the defect and rerun the failed command or browser check plus any dependent regression checks.
8. Save implementation evidence summary in Confluence (`PROD`) and link it to Jira.
9. Add phase checkpoint in `docs/product/traceability/checkpoints`.
10. Summarize changed files, validation evidence, and follow-up risks.

## Required Output
## Implementation Summary
## Files Changed
## Validation Run
## Jira Link
## Confluence Evidence Link
## Risks / Follow-ups

## Rules
- Prefer repository patterns over new abstractions.
- Keep type safety, authorization, and data integrity explicit.
- Avoid speculative refactors and avoid leaving behavior changes untested.
- Follow the development standards at `docs/product/standards/` for all code changes.
- When you encounter a new pattern that should be codified (e.g., a new security approach, logging pattern, error handling pattern), or an existing pattern changes: update the relevant `docs/product/standards/*.md` file before or alongside the code change. Responsible standards per change type:
  - New module/structure → 01-module-structure.md
  - Security pattern changes → 02-security.md
  - Logging pattern changes → 03-logging.md
  - Error handling changes → 04-error-handling.md
  - Notification changes → 05-notification.md
  - API design changes → 07-api-design.md
  - Database/Prisma changes → 08-database.md
  - Code style/TypeScript changes → 10-code-style.md
- For UI stories, include explicit discoverability verification: confirm the new UI is visible to intended roles and hidden from unauthorized roles.
- Do not mark implementation complete if typecheck, lint, tests, build, browser validation, accessibility, content checks, navigation checks, auth checks, or authorization checks are failing because of a product defect.
- For UI stories, execute or prepare evidence against `docs/09_jira_pack/Test_Scripts/global-ui-regression-matrix.md` so existing journeys are protected from regressions.
- Treat missing runtime evidence for UI changes as incomplete implementation unless a genuine blocker is documented.
- Do not close implementation phase without Jira and Confluence evidence links.
