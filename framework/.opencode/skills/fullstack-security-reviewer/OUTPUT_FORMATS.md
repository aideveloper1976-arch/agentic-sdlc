## Output: Security Review Summary
- Scope reviewed (apps/packages/files)
- Overall risk level (`Low`/`Medium`/`High`/`Critical`)
- Final decision (`Pass`/`Pass with Conditions`/`Fail`)

## Output: Report File Metadata
- Report path: `docs/Security Scans/YYYYMMDD_Security_Scan.md`
- Run timestamp (local)
- Reviewer identity

## Output: Findings Table
| Severity | Category | OWASP Mapping | Package/App | File | Finding | Exploitability | Recommended Fix |
|---|---|---|---|---|---|---|---|

## Output: CVE Exposure Table
| Severity | CVE ID | Package | Current Version | Affected Range | Fixed Version | Reachability | Action |
|---|---|---|---|---|---|---|---|

## Output: Required Remediations
- Blocking actions required before merge/release.

## Output: Conditional Follow-ups
- Time-boxed non-blocking actions with owners and due dates.

## Output: Verification Checklist
- Commands/scans executed and pass/fail status.
- Re-test steps for remediated findings.

## Output: Report Section Template
Use this section structure inside the daily report file:

```md
## Scan Run - HH:MM Local Time

### Scope
- <apps/packages/files>

### Decision
- <Pass | Pass with Conditions | Fail>

### OWASP Findings
| Severity | Category | OWASP Mapping | Package/App | File | Finding | Exploitability | Recommended Fix |
|---|---|---|---|---|---|---|---|

### CVE Exposure
| Severity | CVE ID | Package | Current Version | Affected Range | Fixed Version | Reachability | Action |
|---|---|---|---|---|---|---|---|

### Verification Commands
- `<command>` - Pass/Fail

### Remediation Plan
- <required actions>
```
