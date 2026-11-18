## Task: Prepare System Design from Jira Story

### Input
Jira story key (for example `PROJ-43`) resolved via Atlassian MCP

### Steps
1. Read story intent, ACs, dependencies, and technical requirements.
2. Identify impacted APIs, state flows, and data sensitivity.
3. Update `docs/07_system_design/API_Catalog.md` for endpoint contracts.
4. Update architecture/flow/state docs for implementation path.
5. Update `Dev_Handoff_Spec.md` with build tasks and acceptance checks.
6. Add explicit authorization and organisation scope behavior.
7. Add verification guidance for developers and QA.

---

## Task: Pre-Build Design Readiness Pass

### Input
Target Jira story IDs for upcoming build

### Steps
1. Confirm all required `docs/07_system_design/*` files are current.
2. Validate API formats match backend routes.
3. Validate UI/system flow references match expected behavior.
4. Validate audit and sensitivity coverage.
5. Produce a concise readiness summary with any open risks.

---

## Task: Post-Build Reconciliation Pass

### Input
Completed implementation and changed files

### Steps
1. Compare implemented endpoints and behavior vs system design docs.
2. Update API catalog, flows, state models, and handoff notes.
3. Record any story delta and follow-up risk in system design docs.
4. Ensure docs are sufficient for next team iteration.
