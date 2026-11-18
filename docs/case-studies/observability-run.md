# Case study: one feature, end to end

This is an anonymized summary of a real `/run-full-sdlc` run on a production B2B SaaS
platform (TypeScript monorepo: API, web app, shared packages, Postgres, Docker). Product
names, routes and ticket keys are removed.

**Feature:** platform observability. A shared OpenTelemetry package, structured logging
replacing `console.*`, distributed tracing (OTLP / W3C trace context), Prometheus-compatible
metrics, multi-cloud export, and a platform-health dashboard in the admin UI.

| Phase | Agent | Output |
|---|---|---|
| 1. Market research | market-researcher | 300-line research brief |
| 2. Competitor analysis | market-researcher | comparison of vendor and open-source options with verdicts |
| 3. USP and requirements | product-analyst | FRs, NFRs and a risk register (e.g. pin OTel SDK versions) |
| 4. UX design | ui-designer | component tree for the health dashboard, design review |
| 5. Backlog | story-writer | EPIC → Feature → Story backlog, 2,000+ lines of acceptance criteria |
| 6. Architecture review | architect | API contracts and ADRs → **human sign-off** |
| 7. Implementation plan | architect | task-level plan with exact files and types |
| 8. Build | backend-dev, frontend-dev | shared package, API endpoints, dashboard UI |
| 9–10. Self-verification and code regression | test-engineer | typecheck, lint, unit and integration layers: pass |
| 11. Browser UI regression | test-engineer | Playwright pass with caveats recorded |
| 12. UX/HCI review | ux-reviewer | per-flow pass/fail with minor recommendations |
| 13. Code review gate | code-reviewer | **conditional approval**: blocking issues found, fixed, re-verified |
| 14. Security review | security-reviewer | secret, dependency and endpoint-auth scans: no blocking findings |
| 15. Traceability | traceability-recorder | gap report linking every story to code, tests and evidence |
| 16. GitHub PR | release-manager | branch pushed, PR prepared with evidence links |

What this shows:

- The **code review gate actually blocks**. It returned a conditional approval with blocking
  issues, the fix loop ran, and only then did the run continue to security.
- **Every phase left evidence** (16 checkpoint files) that a human reviewer can read in the PR.
- The orchestrator ran all phases in one session because each subagent returned only a
  checkpoint path.

The same framework was used for 18 runs on that platform, covering new modules, a modular
monolith restructure, third-party identity-verification integration, notification
microservice work, a site redesign and several bug-fix runs via `/fix-issue`.
