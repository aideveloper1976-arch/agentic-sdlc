## Task: Post-Release Monitoring Pass

### Input
Target service names or URLs

### Steps
1. Check health endpoints or service health.
2. Review recent logs and error patterns.
3. Inspect metrics and anomalies.
4. Review open alerts.
5. Publish/update Confluence monitoring page in `PROD`.
6. Update Jira issue in the configured Jira project.
7. Return release impact and recommended next actions.

---

## Task: Diagnose Degraded Service

### Input
Target service and recent incident context

### Steps
1. Confirm current health status.
2. Review recent logs and restart behavior.
3. Inspect metrics for spikes or resource pressure.
4. Update Jira incident/release issue in the configured Jira project.
5. Summarize the most likely operational causes.

---

## Task: Pre-Release Runtime Gate

### Input
Target runtime scope

### Steps
1. Check health of critical services.
2. Look for unresolved alerts and recent anomalies.
3. Inspect logs for repeated errors.
4. Publish/update Confluence monitoring evidence page in `PROD`.
5. Return a pass or fail recommendation for release readiness.
