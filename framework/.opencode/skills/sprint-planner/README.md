# SPRINT Planner Skill - Quickstart

## Purpose
Use this skill to analyze backlog stories, prioritize sprint scope, and update sprint-planning docs in `docs/10_sprint_plan`.

## Activation
Use for prompts like:
- "Plan this sprint"
- "Prioritize these Jira stories"
- "Review backlog and propose sprint scope"

## Mandatory First Step
The skill must ask the full Sprint Setup/Priorities/Team State/Story Quality question set before scoring or recommending stories.

## Outputs
- A structured sprint recommendation:
  - Recommended for this sprint
  - Include if capacity allows
  - Recommend deferring
  - Stories needing attention before sprint start
- Optional documentation updates in `docs/10_sprint_plan/*` when requested.

## Docs It Maintains
- `docs/10_sprint_plan/Release_Plan.md`
- `docs/10_sprint_plan/Sprint_Roadmap.md`
- `docs/10_sprint_plan/Sprint_Backlog_Structure.md`
- `docs/10_sprint_plan/Sprint_Dependency_View.md`
- `docs/10_sprint_plan/Milestone_Dependency_Table.md`
- `docs/10_sprint_plan/Sprint_Risk_Register.md`
