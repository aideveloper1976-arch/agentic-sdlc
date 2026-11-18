---
name: stitch-design
description: "Use when the task involves generating, editing, or managing UI designs with Google Stitch — screen design, design system management, design variants, asset download, and frontend implementation using downloaded reference assets."
---

# Stitch Design — AI-Powered UI Design with Google Stitch

Integrate [Google Stitch](https://stitch.withgoogle.com) into the design workflow. Stitch generates high-fidelity UI designs from text prompts or images, manages design systems, and exports visual assets. The frontend developer implements components manually using downloaded reference screenshots and extracted design tokens.

## When to Use This Skill

Load this skill in these scenarios:
- **Phase 5 (UX Design Pre-Build)**: Generating high-fidelity screen designs from requirements, managing design system consistency, creating design variants
- **Phase 8 (Build Web)**: Downloading Stitch screen assets as visual references, extracting design tokens for Tailwind theme configuration, manually implementing React components
- **Phase 12 (UX/HCI Review)**: Comparing Stitch-generated designs against Playwright screenshots of the running implementation to verify visual fidelity
- Any task where high-fidelity visual screen designs are needed before implementation

## Prerequisites

1. **Stitch MCP server** must be configured in `opencode.json` (see `@_davideast/stitch-mcp`)
2. **`STITCH_API_KEY`** environment variable must be set (get one from [stitch.withgoogle.com](https://stitch.withgoogle.com))
3. Verify setup with: `npx @_davideast/stitch-mcp doctor --verbose`

## Available Stitch MCP Tools

The `@_davideast/stitch-mcp` proxy exposes these tools. Only tools listed below actually exist — do not reference any other Stitch MCP tool.

### Project & Asset Management
| Tool | Function | When to Use |
|------|----------|-------------|
| `stitch_create_project` | Create a new Stitch project | Phase 5 — starting a new design sprint |
| `stitch_list_projects` | List all accessible Stitch projects | Phase 5/8/12 — finding existing design work |
| `stitch_get_project` | Get project details and screen instances | Phase 8/12 — retrieving design system + screen metadata |
| `stitch_list_screens` | List screens in a project | Phase 5/8 — enumerating generated screens |
| `stitch_get_screen` | Get screen details including metadata | Phase 8/12 — extracting individual screen reference data |
| `stitch_download_assets` | Download screens and assets to a local directory | Phase 8 — getting reference images for implementation |

### Screen Design
| Tool | Function | When to Use |
|------|----------|-------------|
| `stitch_generate_screen_from_text` | Generate new screens from text prompts | Phase 5 — creating screen designs from requirements |
| `stitch_edit_screens` | Edit existing screens with text instructions | Phase 5 — refining generated screens |
| `stitch_generate_variants` | Generate design variants with configurable creativity | Phase 5 — exploring design alternatives |

### Design System
| Tool | Function | When to Use |
|------|----------|-------------|
| `stitch_create_design_system` | Create a design system with theme tokens (colors, fonts, roundness) | Phase 5 — establishing design language |
| `stitch_update_design_system` | Update an existing design system | Phase 5 — refining design tokens |
| `stitch_apply_design_system` | Apply a design system to selected screens | Phase 5 — enforcing consistency across screens |
| `stitch_list_design_systems` | List available design systems for a project | Phase 5/8 — finding existing design systems |
| `stitch_upload_design_md` | Upload a DESIGN.md file to a project | Phase 5 — feeding structured design specs |
| `stitch_create_design_system_from_design_md` | Create a design system from a DESIGN.md upload | Phase 5 — bootstrapping from design spec |

## Workflow

### Phase 5: UX Design (Pre-Build)

1. **Study existing app** — inspect current pages manually. Use `ux_intelligence_ux_generate_design_system` to get a recommended design system for the product type. Document findings in the design language summary.
2. **Enhance prompts** — use `ux_intelligence` tools (palette, typography, anti-patterns) to inform Stitch prompts before generating screens
3. **Create project** — call `stitch_create_project` with a descriptive title
4. **Create design system** — call `stitch_create_design_system` with theme tokens (colors, fonts, roundness) that match the existing app style
5. **Generate screens** — call `stitch_generate_screen_from_text` for every key screen with detailed prompts. Use `stitch_generate_variants` to explore alternatives for important screens.
6. **Edit and refine** — use `stitch_edit_screens` to adjust generated screens. Apply the design system via `stitch_apply_design_system` to all screens.
7. **Document tokens** — record all design tokens (colors, fonts, spacing, roundness) in a structured format within `STITCH_DESIGN_REVIEW.md` so frontend-dev can consume them
8. **Hand off** — produce `STITCH_DESIGN_REVIEW.md` containing:
   - Stitch project ID and design system asset ID
   - Per-screen: screen ID, title, screenshot URL, key elements
   - Structured design token table (colors, fonts, roundness, spacing)
   - Download instructions for `stitch_download_assets`
   - Component hierarchy, interaction notes, responsive behaviour, state design
   - Blocks continuation until human marks APPROVE

### Phase 8: Build Web (Manual Implementation)

The Stitch MCP has **no code-generation tool**. The frontend developer implements React components manually using Stitch screenshots and extracted design tokens.

1. **Pull designs** — call `stitch_get_project` and `stitch_get_screen` to retrieve project metadata, screen IDs, and design system tokens
2. **Download assets** — call `stitch_download_assets <projectId> <outputDir>` to save reference screenshots locally under `docs/sdlc-runs/<run>/stitch-assets/`
3. **Extract design tokens** — run the `stitch-token-extractor` script (at `tools/stitch-token-extractor/`) to generate or update the Tailwind v4 `@theme` block in your Tailwind config package (e.g. `packages/tailwind-config/stitch-tokens.css`) with the correct colors, fonts, and spacing from the Stitch design system
4. **Implement components** — manually build React components referencing the downloaded screenshots, applying the token-driven Tailwind classes. Use `ux_intelligence_ux_get_stack_guidances` for framework-specific component guidance.
5. **Integrate** — wire components into existing application with correct role-based navigation and state management
6. **Self-verify** — capture Playwright screenshots of the running implementation and compare visually against the Stitch reference screenshots. Flag any obvious deviations.

### Phase 12: UX/HCI Review

1. **Download reference screens** — call `stitch_get_project` to get screen IDs, then `stitch_download_assets` to pull the Stitch reference screenshots into `docs/sdlc-runs/<run>/stitch-assets/`
2. **Capture runtime screenshots** — use Playwright (`test_automation_capture_screenshot`) to navigate the running application and capture screenshots of each implemented screen
3. **Side-by-side comparison** — for each screen, compare the Stitch reference screenshot against the Playwright screenshot. Check:
   - Layout structure (header, sidebar, content areas, positioning)
   - Color usage (primary, secondary, surface, semantic colors)
   - Typography (font family, size, weight, hierarchy)
   - Component styling (cards, tables, buttons, badges, inputs)
   - Spacing and alignment (margins, padding, grid alignment)
   - State rendering (empty, loading, error, success states)
4. **Document deviations** — create a fidelity comparison report at `docs/sdlc-runs/<run>/checkpoints/12-ux-hci-review.md` with screenshots and a pass/fail on each criterion
5. **Flag critical gaps** — any >20% layout or color deviation is a HIGH-severity issue that returns to frontend-dev for remediation

## Manual Implementation Guidelines

Since no automated Stitch-to-code conversion exists, follow these principles:

- **Extract design tokens first** — use `stitch_get_project` + `stitch_get_screen` to identify the design system's primary color, fonts, and roundness. Map these to Tailwind v4 `@theme` CSS variables before building components.
- **Reference screenshots as blueprints** — open the downloaded screenshots side-by-side with your code. Match layout structure, spacing ratios, and visual hierarchy.
- **Reuse existing components** — check the existing UI component library in `apps/web/` for cards, tables, buttons, modals, etc. before building new ones.
- **Use color semantics consistently** — map Stitch color usage to the design token CSS variables:
  | Stitch Color | Token |
  |---|---|
  | Primary action blue | `--color-primary` |
  | Success green | `--color-success` |
  | Warning amber | `--color-warning` |
  | Error red | `--color-danger` |
  | Neutral grey | `--color-neutral` |
  | Surface white | `--color-surface` |
  | Body text | `--color-foreground` |
- **Wire into navigation** — add the new page to the correct role-based navigation surface (System Admin, Organisation Admin, or Organisation User).
- **Cover all states** — implement empty, loading, error, success, and permission-denied states matching the Stitch designs.

## Integration with Other Methodology Skills

- **`ux-skills`** — Use `ux_intelligence` MCP tools (palette, typography, accessibility) to inform Stitch prompts. Run `ux_intelligence_ux_get_palette` and `ux_intelligence_ux_get_typography` before `stitch_generate_screen_from_text` to embed design intelligence into generated screens
- **`writing-plans`** — After generating screen designs, use `writing-plans` to break the implementation into build tasks
- **`fullstack-typescript-developer`** — Used by frontend-dev for implementation
- **`ux-review`** — Used by ux-reviewer for design fidelity comparison

## Anti-Patterns

| Trap | Better Approach |
|------|----------------|
| Expecting automated Stitch-to-code conversion | **There is no `stitch::react-components` tool.** Always implement manually using downloaded reference assets and extracted design tokens |
| Claiming "Stitch fidelity" against wireframes | Stitch fidelity means pixel-level match to a Stitch-generated screenshot, not an ASCII wireframe |
| Building components before extracting design tokens | Always run the token extractor or manually map Stitch tokens to Tailwind CSS variables first |
| Using Stitch as the sole design authority | Stitch generates visual designs — pair with `ux_intelligence` for accessibility, contrast, and UX anti-pattern checks |
| Skipping reference screenshot download | Use `stitch_download_assets` every build phase so you have a visual target |
| Setting up design tokens manually | Use the `stitch-token-extractor` script at `tools/stitch-token-extractor/` to generate Tailwind v4 `@theme` blocks from Stitch project data |
| Reviewing fidelity without browser screenshots | Phase 12 must capture Playwright screenshots alongside Stitch references — code-only review misses visual gaps |
| Using Stitch for non-visual design decisions | Stitch handles visual UI — use `architect` agent for data model, API contracts, and integration architecture |

## Verification Checklist

- [ ] `STITCH_API_KEY` is set and `npx @_davideast/stitch-mcp doctor` passes
- [ ] Existing app style documented (manual inspection + UX intelligence)
- [ ] Design prompts informed by `ux_intelligence` palette/typography/anti-patterns
- [ ] Stitch project created with matching design system
- [ ] Screens generated and refined with design system applied
- [ ] Design tokens extracted into structured table in STITCH_DESIGN_REVIEW.md
- [ ] `stitch_download_assets` run to save reference screenshots
- [ ] Token extractor script run to update Tailwind theme
- [ ] Components implemented referencing downloaded screenshots
- [ ] Playwright screenshots captured for self-verification
- [ ] Side-by-side comparison performed by ux-reviewer
- [ ] Deviations documented and remediated before code review
- [ ] Implementation handoff includes Stitch project references
