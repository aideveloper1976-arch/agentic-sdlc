# Master Orchestrator Rules

The default primary agent is master-orchestrator.

All work must follow:

Idea → Research → EPIC → Feature → Story → UX Design → Architecture Review → ⏸️ Architecture Sign-Off → Implementation Plan → Build → Developer Self-Verification → Automated Code Regression → Browser UI Regression → UX → Code Review → Security → Traceability → UAT → GitHub → Release → Monitor → Merge

No story is complete unless it has:
- upstream research
- EPIC and Feature parent
- acceptance criteria
- implementation evidence
- test evidence
- browser regression evidence where UI is relevant
- UX evidence where relevant
- security evidence where relevant
- release evidence where relevant

Prefer MCP tools over assumptions.

## Autonomous phase continuation rule

When running a lifecycle command such as /run-full-sdlc, /discover-and-write-backlog, /build-story, or /traceability-check:

- Do not stop after completing a phase.
- Do not ask the user whether to continue unless:
  - required input is missing,
  - a destructive action is required,
  - production deployment is requested,
  - credentials or permissions are missing,
  - a tool fails repeatedly.
- After each phase, write a short phase checkpoint to `docs/sdlc-runs/<run>/checkpoints/`.
- Then immediately continue to the next phase.
- Treat intermediate phase outputs as working artifacts, not final answers.
- Final response should only happen after all requested phases are complete or a true blocker is reached.

## SDLC Phase → Agent Mapping

Each lifecycle phase MUST be executed by its designated agent, not by manually writing a document. The orchestrator's job is to launch agents, collect their output, save checkpoints, and continue.

| # | Phase | Agent to Launch | What the Agent Does |
|---|-------|-----------------|---------------------|
| 0 | Knowledge Graph | `architect` | `graphify .` — build knowledge graph from codebase. Run `graphify hook install` for auto-rebuild on commits. Use `query_graph` for impact analysis across all phases. |
| 1 | Market Research | `market-researcher` | Research industry standards, regulations, user expectations |
| 2 | Competitor Analysis | `market-researcher` | Scan competitors, produce comparison matrix |
| 3 | USP Definition | `product-analyst` | Define USP, personas, differentiators, non-goals |
| 4 | EPIC → Feature → Story | `story-writer` | Create backlog with acceptance criteria **AND sync to the Jira project**. Use `graphify query_graph` to identify affected modules and cross-module dependencies per story. Also produce `docs/sdlc-runs/<run>/uat-journey-map.md` — end-to-end user journeys stitched from story acceptance criteria, mapped to UI screens |
| 5 | UX Design (Pre-Build) | `ui-designer` | Study existing application style, extract design language, design screens with **compulsory Google Stitch high-fidelity generation** for every key screen, component hierarchy, user flows, responsive layout, accessibility plan — produce implementation-ready handoff. **Generates `docs/sdlc-runs/<run>/STITCH_DESIGN_REVIEW.md` — blocks continuation until human reviews Stitch designs and marks APPROVE** |
| 6 | Architecture Review | `architect` | Review data model, API contracts, component integration, security, produce ADRs. Use `graphify query_graph` for impact analysis to validate cross-module dependencies. **Generate architecture sign-off package at `docs/sdlc-runs/<run>/ARCHITECTURE_SIGN_OFF.md` — blocks Phase 7 (Implementation Plan) until human approves** |
| 7 | Implementation Plan | `architect` | Define build order, files to create/modify, dependencies. **Only runs after Architecture sign-off is approved** |
| 8 | Build (API) | `backend-dev` | Implement Prisma models, services, API routes, seed data |
| 8 | Build (Web) | `frontend-dev` | Implement wizard UI, result page, answer controls, stepper, and wire new UI into the correct role-based navigation so users can discover it. Download Stitch reference screenshots via `stitch_download_assets` and extract design tokens for Tailwind theme configuration. Implement components manually against downloaded reference images. |
| 9 | Developer Self-Verification | `backend-dev` / `frontend-dev` | Verify touched code paths before handoff; fix and rerun failed checks before leaving build |
| 10 | Automated Code Regression | `test-engineer` | Run typecheck, lint, build, unit, integration, API, and regression checks; separate product bugs from environment failures |
| 11 | Browser UI Regression | `test-engineer` | **Run real browser-based validation before code review for UI changes**: authenticate, execute changed flows and global regression matrix journeys, capture screenshots, run accessibility scans, and save evidence |

### E2E Testing Enforcement (Phase 11 mandatory)

**All browser UI tests MUST use the UI form login pattern.** The `test-engineer` agent must verify:

1. **Config enforcement:** `playwright.config.ts` — `workers: 1`, `fullyParallel: false`, `ignoreHTTPSErrors: true`
2. **Auth pattern:** Only `loginViaUI()` from `apps/web/e2e/helpers/auth.ts` — fills `#login-email` + `#login-password`, clicks "Sign in"
3. **Forbidden:** `localStorage.setItem('auth_token')`, `page.request.post('/api/auth/login')` — these produce false PASS results (pages redirect to login, screenshots show login page)
4. **Production URL:** Tests must run against the Edge URL (`https://w9796486.eero.online/platform`) via `EDGE_URL` env or config default
5. **Pre-commit check:** `npm run test:e2e:lint` blocks commits with forbidden patterns
6. **Documentation:** `apps/web/e2e/README.md` — mandatory reading for all UI test authors
7. **Screenshots must show actual page content** — not the login page. The test-engineer must verify that `page.url()` does not contain `/login` before capturing evidence.

If any screenshot shows the login page instead of the target feature page, the Browser UI Regression gate FAILS and the story returns to implementation.
| 12 | UX/HCI Review | `ux-reviewer` | Review runtime browser evidence for usability, accessibility, content quality, auth flow clarity, error recovery, responsive behavior, and discoverability in correct role-based navigation. Compare implementation against Stitch-generated designs for fidelity |
| 13 | Code Review Gate | `code-reviewer` | Review all new/modified code for correctness, security, patterns after code and browser regression gates pass. Use `graphify query_graph` to verify no unexpected cross-module impacts from changes |
| 14 | Security Review | `security-reviewer` | Scan dependencies, secrets, code security, API security |
| 15 | Traceability Gap Report | `traceability-recorder` | Generate trace report, identify gaps, link entities |
| 16 | UAT Gate | `test-engineer` | **Reads journey map from Phase 5 → executes end-to-end user journeys through real browser UI → asserts business outcomes → generates sign-off evidence package at `docs/sdlc-runs/<run-id>/uat-evidence/UAT_SIGN_OFF.md` → blocks release until human marks APPROVE** (For interactive DEV UAT runs, use `test_automation_run_uat_dev_session` — runs on user's real Chrome via mcp-chrome with visible browser window) |
| 17 | GitHub PR Preparation | `release-manager` | **Commit code, push branch, create PR on GitHub with linked Jira issues only after blocking gates pass including UAT** |
| 18 | Release Readiness | `release-manager` | Produce ship decision, rollout steps, risk assessment |
| 19 | Confluence Publishing | `confluence-writer` | Publish release artefacts and gate status to Confluence |

## Critical Agent Launch Rules

1. **Phase 4 (`story-writer`):** Must create EPICs/Features/Stories in the configured Jira project, not just a local markdown file. If the agent times out generating all stories at once, break into one agent call per EPIC. Use the template-first approach: write structure first, then fill acceptance criteria per EPIC.

2. **Phase 16 (`release-manager`):** Must do the full GitHub workflow: stage files → commit on feature branch → push → create PR. This is NOT a documentation-only phase. The PR must link Jira issue keys in its description. This phase must not start while blocking code, browser, UX, security, or traceability gates remain open.

3. **Phase 18 (`confluence-writer`):** Must publish to Confluence space, not just write a local file. If the configured space (e.g. PROD) is not found, use the first available space.

4. **Never shortcut:** Do not replace agent execution with writing a local document. If a checkpoint file already exists, that means the agent was launched successfully. If not, the phase is incomplete.

4.1. **Phase 5 (`ui-designer`) must use Google Stitch for high-fidelity design:** The ui-designer must call `stitch_create_project`, `stitch_create_design_system`, and `stitch_generate_screen_from_text` for every key screen. After generation, the ui-designer produces `docs/sdlc-runs/<run>/STITCH_DESIGN_REVIEW.md` listing all generated screens with their Stitch project URLs. The orchestrator reads this file and **stops** — the human must review the Stitch screens and mark APPROVE before proceeding to Phase 6 (Architecture Review). ASCII wireframes alone are not sufficient.

5. **Phase 10 (`test-engineer`) Automated Code Regression is mandatory before code review:** `/run-full-sdlc` and `/build-story` must run typecheck, lint, build, unit, integration/API, and relevant regression checks before code review or PR preparation. Any blocking product defect returns to the build agent for remediation and rerun.

6. **Phase 11 (`test-engineer`) Browser UI Regression is mandatory before code review for UI changes:** If a story changes user-facing UI, protected routes, forms, content, or navigation, `/run-full-sdlc` must execute a real browser-based validation pass before UX review and before code review. This phase is incomplete unless one of the following exists:
   - browser flow evidence,
   - screenshots of key states,
   - in-browser accessibility scan results,
   - global UI regression matrix results from `docs/09_jira_pack/Test_Scripts/global-ui-regression-matrix.md`,
   - or a genuine blocker explaining why the browser pass could not run.

7. **Fix-loop is mandatory for gate failures:** If typecheck, lint, unit, integration/API, build, e2e, browser, accessibility, content, navigation, auth, authorization, or UX validation fails because of a product defect, return to the implementation agent, fix the defect, and rerun the failed gate plus dependent regression checks. Do not proceed to code review, GitHub, release readiness, or Confluence publishing while a blocking product defect remains open.

8. **Phase 12 (`ux-reviewer`) must use runtime evidence:** For UI changes, the UX review must consume browser evidence from Phase 11 or perform its own browser pass. Source-only review is not sufficient for release sign-off.

9. **Minimum browser evidence for UI stories:** At least one happy-path flow, relevant negative/validation paths, one accessibility scan, one screenshot per key screen/state, desktop/tablet/mobile checks, content correctness checks, global UI regression matrix evidence, and auth/authorization checks for protected flows must be captured and linked to Jira/Confluence/traceability.

10. **Authorization consistency gate is mandatory for protected flows:** For any story that affects role-, permission-, actor-type-, tenant-, auth-, or authorization-based behavior, the responsible agents must verify parity across all enforced layers: UI visibility/navigation, route/page guards, and API/middleware/service authorization. Evidence must prove:
   - authorized actors succeed,
   - unauthorized actors are denied,
   - privileged/system actors behave according to product intent.
   If any layer disagrees, the story must return to implementation and may not proceed to code review, PR preparation, release readiness, or Confluence publishing.

11. **Persisted UI test script is mandatory for UI stories:** Phase 11 must also produce a durable UI test script artifact that records the exact browser steps used for validation. This can be a markdown test script in `docs/09_jira_pack/Test_Scripts/` and/or an executable browser test file. The artifact must include:
   - happy-path flow steps,
   - key negative-path or validation checks where relevant,
   - auth/authorization checks for protected routes,
   - content checks,
   - desktop/tablet/mobile responsive checks,
   - relevant global UI regression matrix rows executed or excluded,
   - expected results for each step,
   - links to screenshots/evidence where available.

12. **UI discoverability is mandatory for UI stories:** When a story introduces a new UI page, flow, or major feature, the implementing UI agent must add it to the correct navigation surface (System Admin, Organisation Admin, or Organisation User) with correct role/permission visibility rules. Direct URL-only access is insufficient for completion.

12. **UX sign-off must validate navigation visibility and content:** Phase 12 must explicitly verify that new UI is visible to intended roles and hidden from unauthorized roles, that user-facing content is correct and role-appropriate, and include these checks in UX evidence.

13. **UAT Gate is a blocking human sign-off (Phase 16):** After Phase 15 (Traceability), the test-engineer executes UAT journeys from the journey map, asserts business outcomes, and produces a sign-off package. The orchestrator reads `docs/sdlc-runs/<latest>/uat-evidence/UAT_SIGN_OFF.md` before launching Phase 17. If the APPROVE checkbox is not marked with a reviewer name and date, the orchestrator stops and reports: "UAT sign-off required. Review UAT_SIGN_OFF.md and mark APPROVE to continue."

14. **UAT must be browser-verified at screen level for user-facing journeys:** A UAT step only passes when browser assertions confirm the expected rendered screen state. The test-engineer must, for every accepted step:
   - verify the expected URL,
   - verify expected business text/heading is visible,
   - verify forbidden text is absent: `Sign in`, `Access denied`, `404`, `Not Found`,
   - verify the expected control is visible,
   - then capture the screenshot.
   Screenshots captured without these assertions are not valid evidence.

15. **API-only validation cannot pass user-facing UAT:** API checks, DB checks, code inspection, or service verification may support diagnosis, but they cannot replace browser validation for a screen-level UAT PASS.

16. **Pre-seed is mandatory before browser UAT:** The responsible agent must prepare and verify test data before opening the browser: valid users, working passwords, correct role assignments, and journey-driving records.

17. **Headless and headed browser runs are both valid:** The framework may run UAT in headless or visible-browser mode, but the same step-level assertion requirements apply to both.

18. **DEV UAT mode (interactive debugging):** For interactive development/UX review, use `test_automation_run_uat_dev_session` instead of `run_uat_browser_session`. This runs on the user's real Chrome via mcp-chrome — the browser window is visible, the user can watch execution live, and existing Chrome logins/sessions are reused. Prerequisites: mcp-chrome extension loaded in Chrome and connected. Tool is available at `test_automation` MCP as `run_uat_dev_session`.

19. **UAT fix-loop:** If Phase 16 (UAT) fails, the test-engineer classifies each failure as Product Defect (→ `backend-dev`/`frontend-dev`), Design/UX Gap (→ `ux-reviewer`/`architect`), or Requirements Gap (→ `product-analyst` → `story-writer`). The orchestrator routes to the appropriate fix agent. After fix, rerun UAT plus all downstream-dependent regression gates. Do not proceed to GitHub PR (Phase 17) while any UAT failure remains open and unremediated.

20. **Empty journey map handling:** If `uat-journey-map.md` contains no journeys (non-UI story, backend-only change, etc.), Phase 16 produces a "UAT: N/A — no user-facing changes" result and auto-passes. No sign-off required.

21. **UAT command integration:**
   - `/run-full-sdlc` always includes Phase 16 (UAT) as a blocking gate.
   - `/build-story <id>` does NOT include UAT by default. Use `/build-story <id> --with-uat` to run only journeys that include the given story.
   - `/fix-issue <desc>` and `/quick-change <desc>` exclude UAT. If the change touches files in a UAT journey path, the orchestrator warns: "⚠️ This change touches files in UAT journey(s): <journey-names>. Consider re-validating with `/build-story <id> --with-uat`."
     - `/run-uat` runs standalone UAT: executes all journeys and generates sign-off package.

22. **Architecture Sign-Off is a blocking human gate (Phase 6 → 7):** After Phase 6 (Architecture Review), the architect produces `docs/sdlc-runs/<run>/ARCHITECTURE_SIGN_OFF.md` with the architecture design summary, key decisions (ADRs), data model, API contracts, security design, risks, and an APPROVE/REJECT/REQUEST CHANGES sign-off. The orchestrator reads this file before launching Phase 7 (Implementation Plan). If APPROVE is not checked with a reviewer name and date, the orchestrator stops and reports: "Architecture sign-off required. Review ARCHITECTURE_SIGN_OFF.md and mark APPROVE to continue."

23. **Merge Handoff is the final step:** After all phases complete (20 — Confluence Publishing), the orchestrator produces `docs/sdlc-runs/<run>/MERGE_READINESS.md` containing: PR URL, all gate statuses, evidence summary, risk summary, and an APPROVE TO MERGE checkbox. The orchestrator presents the merge summary and stops. The human reviews the PR on GitHub, checks MERGE_READINESS.md, marks APPROVE, and merges to main.

24. **All run artifacts live in the run folder:** Every artifact produced during a run lives under `docs/sdlc-runs/<run>/`. No run artifacts are written to `docs/product/` mid-run. The run folder structure is:
   ```
   docs/sdlc-runs/<run>/
   ├── checkpoints/          # Phase checkpoints (01- through 19-)
   ├── evidence/             # Research evidence, screenshots, test results
   ├── uat-journey-map.md    # User journey map for UAT
   ├── uat-evidence/         # UAT screenshots, browser assertions, sign-off
   ├── ARCHITECTURE_SIGN_OFF.md
   ├── MERGE_READINESS.md
   └── CONTEXT.md            # Run resumption context
   ```

24. **Artifact Promotion After Merge:** After the PR is merged to main, the orchestrator promotes final artifacts from the run folder into permanent `docs/product/` locations:

   | Run Artifact | Promoted To |
   |---|---|
   | `checkpoints/01-market-research.md` | `docs/product/research/market/` |
   | `checkpoints/02-competitor-analysis.md` | `docs/product/research/competitors/` |
   | `checkpoints/03-usp-definition.md` | `docs/product/requirements/` |
   | `checkpoints/04-story-backlog.md` | `docs/product/requirements/` |
   | `checkpoints/05-ux-design.md` | `docs/product/design/` |
   | `checkpoints/06-architecture-review.md` | `docs/product/architecture/` |
   | `checkpoints/07-implementation-plan.md` | `docs/product/architecture/` |
   | `uat-journey-map.md` | `docs/product/uat/` |
   | `uat-evidence/` | `docs/product/uat/evidence/` |
   | `checkpoints/14-security-review.md` | `docs/product/security/` |
   | `checkpoints/15-traceability-gap-report.md` | `docs/product/traceability/` |
   | `checkpoints/17-release-readiness-report.md` | `docs/product/releases/` |
   | `checkpoints/18-confluence-artefact-publishing.md` | `docs/product/releases/` |
   | `checkpoints/10-automated-code-regression.md` | `docs/product/qa/` |
   | `checkpoints/11-browser-ui-regression.md` | `docs/product/qa/` |
   | `checkpoints/12-ux-hci-review.md` | `docs/product/qa/` |
   | `checkpoints/13-code-review-gate.md` | `docs/product/qa/` |

   Promotion only happens after merge. The run folder is preserved as an immutable record.

25. **Docker rebuild is mandatory after any code change:** The orchestrator MUST dispatch a rebuild step after every fix cycle, quick change, or implementation step that modifies backend or frontend code. Subagents run tests against the source tree (`npx jest`, `npx tsc`), NOT against the running Docker container. Without a rebuild, the committed fix exists in git but the running container still has old code — causing "stale container" errors.

   The rebuild step MUST:
   1. Identify which Docker services are affected by the code change (e.g., `platform-api` for backend changes, `platform-web` for frontend changes).
   2. Rebuild the affected service(s) using `docker compose -f docker-compose.yml build --no-cache --build-arg "CACHE_BUST=$(git rev-parse --short HEAD)" <service>`.
   3. Restart the affected service(s) using `docker compose up -d --force-recreate --no-deps <service>`.
   4. Wait for the container to be healthy before reporting completion.
   5. Verify the fix is live by making a direct API call or browser check.

   This step is dispatched as a subagent (backend-dev or test-engineer) and runs AFTER the verify step but BEFORE the final summary. The orchestrator records: `Rebuild done → <service(s)> healthy`.

   Service-to-code mapping: define one line per service in your project's own AGENTS.md, e.g.
   - `api` → `apps/api/**`, `packages/**`
   - `web` → `apps/web/**`, `packages/ui/**`

26. **Diagnosis must trace the full request path end-to-end before proposing a fix.** When investigating a runtime error (HTTP errors, permission failures, missing headers):

   1. **Always open the browser and capture the actual network request.** Do not assume what the client sends — check the Network tab in DevTools.
   2. **Trace the request through every layer:** browser → edge proxy (Caddy) → API → middleware → route handler → service → database. Identify which layer produces the error.
   3. **Check server logs** for the exact error with `docker logs`.
   4. **Verify assumptions about the running container:** `docker exec` to check compiled JS has the expected code. Do not assume a commit = deployed.
   5. **Write a failing E2E test** that reproduces the user's exact experience, not just a unit test of one layer.

   A diagnosis that only checks one layer (e.g. "the middleware works in isolation") is **incomplete** if it doesn't confirm what the client actually sends and what the server actually receives.

## Development Standards

Put your project's coding standards in `docs/product/standards/` and list them here, one row per change type (module structure, security, logging, error handling, API design, database, testing, code style). Every agent must read the relevant standard during Build (Phase 8), Self-Verification (Phase 9) and any fix loop.

## Temporary Files

Never write scratch/working output (patch scripts, debug notes, screenshots, Playwright/browser dumps such as `*.yml`/`*.png`) to the project root, `docs/`, or `scripts/`. Use `tmp/` (gitignored). Only promote a file out of `tmp/` when it is genuine, reviewed evidence required by an SDLC gate.
