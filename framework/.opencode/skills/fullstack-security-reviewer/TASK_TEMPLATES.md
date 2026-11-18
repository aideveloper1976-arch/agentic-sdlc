## Task: PR Security Review (Full Stack)

### Input
PR diff or changed files

### Steps
1. Identify changed trust boundaries (client input, API entry points, data stores, external calls).
2. Review code for OWASP Top 10 and API Top 10 risks.
3. Validate authentication, authorization, session/token controls, and tenant scoping.
4. Validate input validation, output encoding, and secure error handling.
5. Validate secrets handling and sensitive-data logging controls.
6. Run dependency vulnerability checks and lockfile-based CVE scanning.
7. Classify findings by severity and exploitability.
8. Save/update `docs/Security Scans/YYYYMMDD_Security_Scan.md` with findings and decision.
9. Output remediation actions and security decision.

---

## Task: Dependency and CVE Sweep

### Input
Workspace manifests and lockfiles

### Steps
1. Enumerate direct and transitive dependencies by workspace/package.
2. Run package-manager audit (`npm audit`) in the monorepo root where applicable.
3. Run OSV-based scan (`osv-scanner`) when available.
4. Cross-check high-risk advisories against NVD/GitHub advisories.
5. Mark each CVE as reachable/unreachable in runtime context.
6. Propose upgrade or mitigation path, including interim controls.
7. Save CVE results into `docs/Security Scans/YYYYMMDD_Security_Scan.md`.

---

## Task: Auth and Access Control Deep Review

### Input
Auth, session, and authorization code paths

### Steps
1. Trace login/session/token lifecycle and invalidation paths.
2. Validate RBAC/ABAC checks at route, handler, and service layers.
3. Validate tenant/organisation scope isolation and object-level authorization.
4. Test for vertical/horizontal privilege escalation conditions.
5. Verify audit log completeness for privileged and sensitive actions.
6. Save auth/access findings into `docs/Security Scans/YYYYMMDD_Security_Scan.md`.
7. Produce blocking findings and exact remediation guidance.

---

## Task: Release Security Gate

### Input
Release branch and target environment assumptions

### Steps
1. Run focused OWASP control checks on critical business flows.
2. Run dependency/CVE checks and verify no unresolved blocking exposure.
3. Confirm security headers, CORS, CSP, and rate-limit posture.
4. Confirm secret/config hygiene and least-privilege settings.
5. Confirm logging/monitoring signals for abuse and incident response.
6. Save final release-gate report to `docs/Security Scans/YYYYMMDD_Security_Scan.md`.
7. Issue final `Pass`, `Pass with Conditions`, or `Fail` decision.
