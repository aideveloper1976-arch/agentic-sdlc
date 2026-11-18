# UX Intelligence MCP

Design-system intelligence server: a searchable local database of UI styles, color palettes, typography pairings, product-type guidelines, accessibility rules, and anti-patterns — used to ground UI/UX design decisions instead of guessing.

## What this server is

- Runtime: Node.js + TypeScript
- Transport: stdio (`StdioServerTransport`)
- Entry point: `src/index.ts`
- Build output: `dist/index.js` (build also copies `src/data/*.json` into `dist/data/`)
- Data source: static JSON under `src/data/` (styles, palettes, typography, guidelines, anti-patterns, products, stack-guidelines) — no external API calls, no secrets required

## Prerequisites

- Node.js 18+

## Install and build

```bash
cd ux-intelligence-mcp
npm install
npm run build
```

## Environment variables

None required. `UX_DATA_DIR` can optionally override the data directory in dev mode (defaults to `src/data`).

## OpenCode MCP config

```json
"ux_intelligence": {
  "type": "local",
  "command": ["node", "ux-intelligence-mcp/dist/index.js"],
  "enabled": true
}
```

## Available tools

| Tool | Description |
|---|---|
| `ux_generate_design_system` | Generate a coherent design system (palette + typography + style) for a product type |
| `ux_search_guidelines` | Search UX guidelines by keyword/topic |
| `ux_get_palette` | Look up a specific color palette by id/category |
| `ux_get_typography` | Look up a font pairing |
| `ux_get_style` | Look up a UI style definition |
| `ux_check_accessibility` | Check a design choice against accessibility guidelines |
| `ux_get_anti_patterns` | List known UX anti-patterns to avoid |
| `ux_get_stack_guidelines` | Get stack-specific UI guidance (React, Vue, SwiftUI, etc.) |
| `ux_list_product_types` | List supported product types |
| `ux_list_styles` | List available UI styles |

## Usage examples

- "Suggest a design system for a fintech dashboard"
- "What accessibility issues apply to this color contrast?"
- "Give me a font pairing for a playful consumer app"

## Notes and troubleshooting

- If `npm run build` fails to find data files at runtime, confirm `dist/data/` exists — the build script copies `src/data/*.json` there; re-run `npm run build` if it's missing.
