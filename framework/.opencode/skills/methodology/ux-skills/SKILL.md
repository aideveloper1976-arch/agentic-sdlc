---
name: ux-skills
description: "Use when the task involves UI/UX design decisions — building interfaces, choosing styles, selecting colors, implementing components, or checking accessibility. Calls the ux-intelligence MCP for data-driven design guidance."
---

# UX Design Intelligence

When a task involves UI structure, visual design, interaction patterns, or user experience quality, use the `ux-intelligence` MCP tools to get data-driven design guidance before writing code.

## Available MCP Tools

The `ux-intelligence` MCP server provides these tools. Call them directly based on the task:

| Tool | When to Call | What You Get |
|------|-------------|--------------|
| `ux_generate_design_system` | Building any UI from scratch | Complete design system: style, colors, typography, effects, anti-patterns, checklist |
| `ux_search_guidelines` | Need specific UX guidance (contrast, touch targets, loading) | Ranked UX guidelines with checks and anti-patterns |
| `ux_get_palette` | Choosing a color scheme | Color palette with hex codes and usage roles |
| `ux_get_typography` | Selecting fonts | Font pairing with scale and Google Fonts import URL |
| `ux_get_style` | Choosing a visual direction | Style recommendation with effects and best-for guidance |
| `ux_check_accessibility` | Verifying color contrast | WCAG ratio with AA/AAA pass/fail and recommendation |
| `ux_get_anti_patterns` | Avoiding common mistakes | Industry or style-specific anti-patterns with alternatives |
| `ux_get_stack_guidelines` | Implementing in a specific framework | Framework-specific component guidance and patterns |
| `ux_list_product_types` | Browsing available product types | All 161 supported types, filterable by category |
| `ux_list_styles` | Browsing available styles | All 67 styles with descriptions and best-for guidance |

## Workflow

### When Starting a New UI Task

1. **Call `ux_generate_design_system`** with the product type to get a complete design system
2. **Call `ux_get_stack_guidelines`** with your framework to get implementation patterns
3. **Call `ux_get_anti_patterns`** for the industry to avoid common mistakes
4. Present the design system to the user as part of the brainstorming process
5. Implement the UI using the design system as the specification
6. **Call `ux_check_accessibility`** during implementation to verify contrast ratios

### When Refining an Existing UI

1. **Call `ux_search_guidelines`** with the specific issue (e.g., "contrast", "touch targets", "loading")
2. Follow the guideline's checks and anti-patterns
3. **Call `ux_check_accessibility`** to verify any color changes

### When Reviewing UI

1. **Call `ux_get_anti_patterns`** for the industry or style to check for common mistakes
2. **Call `ux_search_guidelines`** for "accessibility" with priority "CRITICAL" for the most important checks

## Example

```
User: "Build a landing page for my fintech banking app"

Agent:
  1. Calling ux_generate_design_system("fintech banking", "landing")
     → Returns: style=Minimalism+Trust, palette=navy+gold, typography=Inter/IBM Plex
  2. Calling ux_get_stack_guidelines("next")
     → Returns: Next.js App Router patterns, Server/Client component split
  3. Calling ux_get_anti_patterns("fintech")
     → Returns: "No playful colors", "Show security badges prominently"
  4. Presenting design to user with all intelligence baked in
  5. Implementing using the design system as the spec
```

## Relationship to Other Tools

- **ux-intelligence-mcp** (this MCP) = design GUIDANCE — what to build, what colors to use, what to avoid
- **ux-hci-mcp** (existing) = design REVIEW — analyze a built page for usability and accessibility issues
- Use `ux-intelligence` during BUILD phase, `ux-hci` during TEST phase
