---
name: ux-review
description: Review UX, usability, accessibility, authentication and authorization flow quality for UI changes with evidence-backed findings.
---

# UX Review

## Goal
Validate that a user-facing change is usable, accessible, coherent, and aligned with the intended user flow.
Layouts under review must support desktop, tablet, and mobile rendering with clear responsive behavior.

## System of Record
- Jira project: `$JIRA_PROJECT_KEY` for UX gate status.
- Confluence space: `PROD` for UX review artefacts.

## When to Use
- After UI implementation.
- Before release of user-facing changes.
- When diagnosing friction in forms, navigation, or key flows.

## Required Inputs
- Page, route, or flow under review.
- Intended user task or acceptance criteria.
- Any known device, viewport, or accessibility constraints.
- Auth context: expected roles, permission boundaries, and signed-in/signed-out states.
- Browser evidence from the test phase when available: screenshots, accessibility results, flow logs, and auth/authorization observations.

## Workflow
1. Review page structure, navigation, and key tasks.
2. Evaluate usability heuristics and accessibility basics.
3. Test authentication UX paths: sign-in, session expiry, sign-out, and re-auth prompts.
4. Test authorization UX paths: role-based visibility, denied actions, and permission messaging.
5. Validate responsive layout behavior across desktop, tablet, and mobile breakpoints.
6. Analyze critical user flows and friction points using runtime browser evidence.
7. Validate discoverability: new UI must be reachable from the correct role-based navigation and not only by direct URL.
8. Validate role visibility: intended roles can see the navigation item and unauthorized roles cannot.
9. Validate content correctness: headings, labels, helper text, CTA text, empty states, error messages, confirmation messages, and role-specific copy.
10. Validate changed or impacted journeys against `docs/09_jira_pack/Test_Scripts/global-ui-regression-matrix.md` where applicable.
11. If browser evidence is missing for a UI change, run a browser pass or explicitly fail the review as incomplete.
12. Capture evidence such as screenshots, violations, or flow observations.
13. Publish/update UX evidence page in Confluence (`PROD`).
14. Update Jira story in the configured Jira project with findings and links.
15. Add phase checkpoint in `docs/product/traceability/checkpoints`.
16. Summarize issues by severity and release impact.

## Required Output
## UX Summary
## Flow Reviewed
## Findings
## Accessibility Notes
## Authentication Notes
## Authorization Notes
## Evidence
## Recommendation

## Rules
- Prioritize clarity, accessibility, error recovery, and task completion.
- Treat auth failures and permission confusion as UX blockers for protected flows.
- For UI stories, attach runtime UX evidence instead of relying on subjective claims.
- Source-only review is not sufficient for sign-off when the change affects user-facing UI, forms, navigation, or protected flows.
- Navigation discoverability is mandatory for UI sign-off: mark review as incomplete if a new feature is not wired into the correct role-based navigation.
- Responsive design is part of the UX gate: reviews must check that the layout remains usable and readable on desktop, tablet, and mobile.
- Call out breakpoint-specific issues such as overflow, hidden actions, cramped forms, broken stepper/navigation, or unreadable density.
- Content correctness is part of the UX gate: missing, misleading, stale, role-inappropriate, or inconsistent content must be reported with severity.
- UX sign-off must not pass while blocking browser regression, accessibility, content, navigation, auth, or authorization defects remain open.
- Distinguish cosmetic polish from blockers that impair completion or comprehension.
