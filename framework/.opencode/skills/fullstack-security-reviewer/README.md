# Full Stack Security Reviewer Skill - Quickstart

## Purpose
Use this skill to run OWASP-aligned security reviews and CVE exposure checks across a full stack codebase.

## Typical Usage

### 1) PR security gate
```text
Use fullstack-security-reviewer on this PR.
Assess OWASP Top 10/API Top 10 risks and dependency CVEs.
Return blocking findings first and a final decision.
```

### 2) Dependency and CVE sweep
```text
Use fullstack-security-reviewer for a dependency CVE sweep.
Scan lockfiles, list reachable CVEs, and provide fix versions.
```

### 3) Auth/access control deep review
```text
Use fullstack-security-reviewer for auth and authorization review.
Focus on scope isolation, privilege escalation, and session/token controls.
```

## Suggested Command Baseline
For an npm-workspaces + turbo monorepo, run:

```bash
npm ci
npm run check-types
npm run lint
npm audit --omit=dev
osv-scanner --lockfile=package-lock.json
```

Optional (if tooling exists in repo/CI):

```bash
trivy fs .
snyk test
```

## Expected Output
- Security findings mapped to OWASP categories.
- CVE exposure table with reachability assessment.
- Required remediations and conditional follow-ups.
- Verification checklist and final decision.

## Mandatory Report Location
- Save each scan report under `docs/Security Scans/`.
- Required filename format: `YYYYMMDD_Security_Scan.md`.
- If a same-day file exists, append a new section with time and scan scope.
