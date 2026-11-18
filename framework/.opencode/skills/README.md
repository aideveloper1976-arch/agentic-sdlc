# Skills Index

This directory contains reusable OpenCode skills for research, analysis, planning, design, implementation, review, release, and traceability workflows.

Environment-backed defaults used across these skills:
- Jira project key: `$JIRA_PROJECT_KEY`
- Confluence space key: `PROD`
- Evidence root: `docs/product/evidence`
- Traceability reports: `docs/product/traceability/reports`
- Lifecycle checkpoints: `docs/product/traceability/checkpoints`

## Standard Structure

Each active canonical skill should use this file set where practical:
- `SKILL.md`
- `README.md`
- `SYSTEM_PROMPT.md`
- `TASK_TEMPLATES.md`
- `OUTPUT_FORMATS.md`
- `CHECKER.md`

Process-heavy skills may also include repository-specific policy files when a workflow must be followed exactly.

## Canonical Skills

Core SDLC canonicals for this repo:
- `idea-discovery` - Idea framing, business hypothesis, and discovery handoff.
- `fullstack-business-analyst` - Requirement analysis, Jira alignment, and traceable scope refinement.
- `fullstack-solution-architect` - Build-ready architecture and system-design updates.
- `fullstack-typescript-developer` - Production-grade implementation and refactoring for the application stack.
- `fullstack-tester-reviewer` - Multi-layer test validation and release-readiness review.
- `fullstack-security-reviewer` - Security review of code, dependencies, auth, and runtime posture.
- `fullstack-code-reviewer` - Structured code review and merge-risk analysis.
- `fullstack-git-commit-tracker` - Commit preparation aligned to tracking and changelog evidence.
- `github-pr-management` - Branch push, PR creation, checks review, and merge-readiness gating.

Distinct specialist canonicals:
- `browser-research` - Evidence-based external research and competitor analysis.
- `confluence-writer` - Structured Confluence page creation and updates.
- `document-intake` - Requirement and evidence extraction from source documents.
- `epic-feature-story-writing` - EPIC to Feature to Story backlog authoring.
- `langgraph-ai-developer` - AI agent and workflow implementation using LangGraph with evaluation and observability.
- `monitoring-review` - Runtime health, logs, metrics, and anomaly review.
- `release-management` - PR quality, release notes, and release readiness.
- `sprint-planner` - Sprint planning, prioritization, and capacity tradeoff analysis.
- `traceability-validation` - Lifecycle traceability gap analysis.
- `ux-review` - UX, usability, and accessibility review.

## SDLC Ownership Rule

- Jira is the workflow source of truth for status, ownership, acceptance criteria, and approvals.
- Confluence (`PROD`) is the documentation and evidence source of truth for long-form artefacts.
- For each phase, update Jira and link the corresponding Confluence artefact.
- After each phase, write a checkpoint under `docs/product/traceability/checkpoints`.

## Alias Skills

These generic names remain as compatibility aliases and should point to the canonical skills above:
- `product-analysis` -> `fullstack-business-analyst`
- `architecture-design` -> `fullstack-solution-architect`
- `implementation` -> `fullstack-typescript-developer`
- `testing` -> `fullstack-tester-reviewer`
- `security-review` -> `fullstack-security-reviewer`

## Usage Note

Prefer the canonical skill names for new prompts and documentation. Keep aliases lightweight and avoid giving them richer support files than their canonical target.
