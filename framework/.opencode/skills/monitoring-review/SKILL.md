---
name: monitoring-review
description: Review runtime health, logs, metrics, alerts, and anomalies after testing or release activity.
---

# Monitoring Review

## Goal
Validate runtime health and detect operational issues that affect release readiness or post-release confidence.

## When to Use
- After deployment or release candidate validation.
- After major testing passes on running services.
- When diagnosing degraded, down, or unstable services.

## Required Inputs
- Service names or URLs.
- Target environment or runtime scope.
- Any known incidents, alerts, or recent changes.

## Workflow
1. Check service and API health.
2. Review logs, metrics, container state, and anomalies.
3. Inspect open alerts or repeated error patterns.
4. Summarize operational risk and release impact.
5. Publish monitoring evidence in Confluence (`PROD`).
6. Update related Jira release/incident issue in the configured Jira project with monitoring outcome.
7. Add phase checkpoint in `docs/product/traceability/checkpoints`.

## Required Output
## Monitoring Summary
## Services Checked
## Health Status
## Log Findings
## Metrics Snapshot
## Anomalies
## Alerts
## Recommendations
## Pass / Fail

## Rules
- Do not ignore repeated errors or restart loops.
- If a service is degraded or down, treat release readiness as blocked until explained.
- Prefer observed evidence over assumptions about health.
- Do not close monitoring phase without Jira and Confluence evidence links.
