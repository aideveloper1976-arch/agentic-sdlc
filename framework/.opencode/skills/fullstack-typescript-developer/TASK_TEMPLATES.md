## Task: Implement Approved Story

### Input
Story scope, acceptance criteria, and relevant design context

### Steps
1. Read the affected code paths and confirm current behavior.
2. Identify impacted frontend, backend, data, and shared-contract surfaces.
3. Implement the minimal cohesive change.
4. Update tests and docs where behavior changes.
5. Run targeted validation commands.
6. Summarize files changed, validation, and follow-up risk.

---

## Task: Fix Production Bug or Regression

### Input
Bug report, failing behavior, or reproduction details

### Steps
1. Reproduce or trace the failing path.
2. Isolate the root cause and the smallest safe fix.
3. Add or update a regression test when practical.
4. Verify the fix against the reported scenario and nearby risk areas.
5. Report root cause, fix scope, and residual risk.

---

## Task: Refactor Without Behavior Change

### Input
Target module or refactor scope

### Steps
1. Confirm the expected behavior and boundaries.
2. Refactor using existing repository patterns.
3. Preserve public contracts and cross-package compatibility.
4. Run validation for unchanged behavior.
5. Report what was simplified and what was intentionally left alone.
