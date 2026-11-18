## Output: Review Summary
- Scope reviewed (files/modules)
- Affected apps/packages
- Overall risk level (`Low`/`Medium`/`High`)
- Merge decision (`Approve`/`Approve with Follow-ups`/`Request Changes`)

## Output: Findings Table
| Severity | Area | Package/App | File | Finding | Why It Matters | Recommended Fix |
|---|---|---|---|---|---|---|

## Output: Required Changes
- Blocking issues that must be fixed before merge.

## Output: Suggested Improvements
- Non-blocking improvements for maintainability/performance.

## Output: Test Coverage Notes
- Existing test coverage observed.
- Missing critical tests (if any).

## Output: Command Execution Notes
- Commands run (`typecheck`, `lint`, `test`, `build`) and scope (`affected` vs `repo-wide`).
- Pass/fail status per command.
- Failure-to-finding mapping with severity.

## Output: Monorepo Health Notes
- Contract drift risk across packages.
- Build graph/cache impact risk.
- TypeScript config or path alias issues.

## Output: Documentation Alignment Notes
- Docs that were correctly updated.
- Docs that should be updated before merge.
