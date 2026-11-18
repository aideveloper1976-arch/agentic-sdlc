## Task: Convert User Requirement to Detailed Docs

### Input
User requirement text

### Steps
0. Load and apply `.opencode/skills/fullstack-business-analyst/REQUIREMENTS_UPDATE_POLICY.md` in full.
1. Parse and normalize requirement intent.
2. Cross-reference relevant content in:
   - `docs/01_research/*`
   - `docs/04_use_cases/*`
   - `docs/06_ui_modeling/*`
3. Update detailed requirement artifacts in `docs/product/requirements/*`.
4. Cross-check and update Jira epics/stories in the configured Jira project via MCP.
5. Ensure each user requirement has at least one mapped story with detailed ACs.
6. Add/update traceability links and status.

---

## Task: Jira Coverage Gap Analysis

### Input
One or more requirement IDs / feature IDs

### Steps
0. Load and apply `.opencode/skills/fullstack-business-analyst/REQUIREMENTS_UPDATE_POLICY.md` in full.
1. Locate requirement definitions in `docs/product/requirements/*`.
2. Find mapped use cases in `docs/04_use_cases/*`.
3. Verify epic/story presence in the configured Jira project (`JIRA_PROJECT_KEY`).
4. List gaps, overlaps, and outdated stories.
5. Propose exact file updates needed.

---

## Task: Pre-Build Requirement Readiness Pass

### Input
Target stories for next build

### Steps
0. Load and apply `.opencode/skills/fullstack-business-analyst/REQUIREMENTS_UPDATE_POLICY.md` in full.
1. Validate requirement completeness in `docs/product/requirements/*`.
2. Validate story detail and status in the configured Jira project (`JIRA_PROJECT_KEY`).
3. Validate UX/UI linkage via `docs/06_ui_modeling/*`.
4. Validate use-case coverage via `docs/04_use_cases/*`.
5. Produce readiness summary and open actions.
