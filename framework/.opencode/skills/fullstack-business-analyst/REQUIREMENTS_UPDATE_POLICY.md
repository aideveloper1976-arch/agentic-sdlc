# Requirements Update Policy (Skill Copy)

This is the mandatory in-skill copy of `docs/dev_practice/requirements_update.md`.

## Purpose
Run requirement updates with one canonical workflow:
- repo docs for requirements and design context
- the configured Jira project (`JIRA_PROJECT_KEY`) as the execution source of truth
- Atlassian MCP as the Jira update mechanism

## Mandatory Execution Rules
1. Always update requirement details in `docs/product/requirements/*`.
2. Always update impacted Jira Epic/Story issues in the configured Jira project via MCP in the same pass.
3. Do not treat `docs/09_jira_pack/*` as the primary authoring source for Jira updates.
4. Preserve traceability: requirement ID -> use case ID -> Jira issue key.
5. Keep business terminology as `organisation`/`organisations`; keep technical keys like `tenant_id` where required.

## Required Jira Update Content
For every changed Jira story:
- summary and description aligned to requirement wording
- explicit acceptance criteria
- explicit authorization and organisation-scope behavior
- references to test-script artifacts when available

## Standard Process
1. Analyze user requirement change.
2. Update `docs/03_requirements/*` and related use case/design docs.
3. Resolve impacted Jira stories in the configured Jira project.
4. Update Jira issue descriptions/ACs via MCP.
5. Link test-script references to impacted stories.
6. Produce a traceability summary with Jira keys.

## Completion Criteria
- Requirements docs are updated and internally consistent.
- Jira issues in the configured Jira project are updated for every impacted requirement.
- Traceability mapping is explicit and complete.
- No unresolved wording mismatch between requirements and Jira story intent.
