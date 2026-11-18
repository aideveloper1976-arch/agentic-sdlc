# Full Stack Business Analyst Skill - Quickstart

## Purpose
Use this skill to turn user requirements into detailed requirement documentation and Jira updates via Atlassian MCP.

## Mandatory Rule
- Always apply every instruction in `.opencode/skills/fullstack-business-analyst/REQUIREMENTS_UPDATE_POLICY.md`.
- This file is the in-skill authoritative checklist copied from `docs/dev_practice/requirements_update.md`.

## Directories Used
- `docs/01_research/*`
- `docs/product/requirements/*`
- `docs/04_use_cases/*`
- `docs/06_ui_modeling/*`
- Jira target: the configured Jira project via Atlassian MCP.

## Example Prompts

### 1) New requirement intake
```text
Use fullstack-business-analyst for this user requirement:
<requirement text>
Update docs/03_requirements and the Jira project issues with full traceability.
```

### 2) Requirement change impact pass
```text
Use fullstack-business-analyst to process requirement changes for FR-2 and FR-8.
Cross-check docs/04_use_cases and docs/06_ui_modeling, then update Jira stories via MCP.
```

### 3) Pre-build readiness check
```text
Use fullstack-business-analyst for readiness pass on STORY-1805, STORY-1806, STORY-1807.
List requirement/Jira gaps and update docs as needed.
```

## Expected Output
- Updated requirement artifacts in `docs/product/requirements/*`
- Updated Jira issues in the configured Jira project via MCP
- Requirement-to-story traceability summary
