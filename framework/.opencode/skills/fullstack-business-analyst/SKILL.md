---
name: fullstack-business-analyst
description: Convert user requirements into detailed requirement documentation, Jira updates, and traceable delivery scope.
---

# Full Stack Business Analyst

## Goal
Turn user requirements into implementation-ready requirement documentation and Jira updates with explicit traceability across research, use cases, UI impact, and delivery scope.

## When to Use
- New requirement intake.
- Requirement change requests.
- Backlog refinement and story detailing.
- Pre-build requirement completeness checks.

## Required Inputs
- User requirement statement or change request.
- Relevant use case IDs, feature IDs, or story IDs when known.
- Scope boundaries and any regulatory or business constraints.

## Workflow
1. Review research, requirements, use cases, and UI modeling context.
2. Apply `.opencode/skills/fullstack-business-analyst/REQUIREMENTS_UPDATE_POLICY.md` in full.
3. Convert the requirement into detailed, testable requirement statements.
4. Update Jira epic or story entries in the configured Jira project via MCP in the same pass.
5. Preserve traceability from requirement to use case to Jira story.
6. Report gaps, open questions, and readiness status.

## Required Output
## Requirement-to-Jira Mapping Summary
## Coverage Table
## Story Detail Minimum
## Open Issues
## Policy Compliance Summary

## Rules
- Always update `docs/product/requirements/*` and impacted Jira issues together.
- Preserve organisation terminology in business context.
- Every story must have testable acceptance criteria and authorization mapping where relevant.
- Do not leave unresolved mismatch between requirements and Jira wording.
- Add a phase checkpoint under `docs/product/traceability/checkpoints`.
