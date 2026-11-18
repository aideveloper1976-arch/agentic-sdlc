## Task: Validate Story Traceability

### Input
Story key or traceability entity

### Steps
1. Retrieve the current trace chain.
2. Check upstream research, feature, and EPIC links.
3. Check downstream code, test, UX, security, PR, and release links.
4. Return missing links and required fixes.

---

## Task: Release Traceability Gate

### Input
Release scope or release entity

### Steps
1. Check all stories included in the release.
2. Verify required validation and evidence links.
3. Check PR and monitoring evidence coverage.
4. Return a release readiness decision.

---

## Task: Gap Remediation Pass

### Input
One or more target items with known trace issues

### Steps
1. Retrieve the current trace state.
2. Enumerate each missing link.
3. Classify blocker vs non-blocker gaps.
4. Return exact remediation actions.
