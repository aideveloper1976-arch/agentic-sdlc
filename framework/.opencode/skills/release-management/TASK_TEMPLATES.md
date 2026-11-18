## Task: Prepare Pull Request Summary

### Input
Branch diff and story scope

### Steps
1. Review the diff and changed scope.
2. Summarize the purpose of the change.
3. Link story IDs, feature IDs, and evidence.
4. Add risks and rollback notes.
5. Update Jira issue(s) in the configured Jira project with PR linkage.
6. Return a PR-ready summary.

---

## Task: Release Readiness Pass

### Input
Target release scope

### Steps
1. Confirm traceability coverage.
2. Confirm test, UX, security, and monitoring evidence as relevant.
3. Review outstanding risks and blockers.
4. Create/update Confluence release readiness page in `PROD`.
5. Update Jira release issue in the configured Jira project.
6. Write checkpoint and return release decision with follow-up actions.

---

## Task: Release Notes Creation

### Input
Target branch or release scope

### Steps
1. Identify the user-visible and operationally important changes.
2. Summarize validation evidence.
3. Include risks, known issues, and rollback notes.
4. Publish/update Confluence release notes page in `PROD`.
5. Return release-ready notes.
