## Output: Test Review Summary
- Scope reviewed (apps/packages/files)
- Coverage confidence (`Low`/`Medium`/`High`)
- Final decision (`Pass`/`Pass with Conditions`/`Fail`)

## Output: Layer Status Matrix
| Layer | Scope | Result | Notes |
|---|---|---|---|
| Typecheck |  | Pass/Fail |  |
| Lint |  | Pass/Fail |  |
| Unit |  | Pass/Fail |  |
| Integration/API |  | Pass/Fail |  |
| E2E/Smoke |  | Pass/Fail |  |
| Build |  | Pass/Fail |  |

## Output: Findings Table
| Severity | Category | Package/App | File | Finding | Evidence | Required Action |
|---|---|---|---|---|---|---|

## Output: Required Remediations
- Blocking actions required before merge/release.

## Output: Conditional Follow-ups
- Time-boxed non-blocking tasks with owner and due date.

## Output: Report Metadata
- Report path: `docs/Test Reviews/YYYYMMDD_Test_Review.md`
- Run timestamp (local)
- Reviewer identity

## Output: Report Section Template
```md
## Test Review Run - HH:MM Local Time

### Scope
- <apps/packages/files>

### Decision
- <Pass | Pass with Conditions | Fail>

### Layer Status
| Layer | Scope | Result | Notes |
|---|---|---|---|

### Findings
| Severity | Category | Package/App | File | Finding | Evidence | Required Action |
|---|---|---|---|---|---|---|

### Commands Executed
- `<command>` - Pass/Fail

### Remediation Plan
- <required actions>
```
