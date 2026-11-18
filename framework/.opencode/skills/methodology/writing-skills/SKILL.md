---
name: writing-skills
description: "Use when creating or modifying methodology skills. Handles self-reference by using external principles when modifying writing-skills itself."
---

# Writing Skills

When creating or modifying skills in the methodology framework, follow these guidelines to ensure consistency, clarity, and effectiveness.

## Self-Reference Handling

If the skill being created or modified is **this skill** (`writing-skills`), you are in a self-referential situation. This skill cannot reference itself to validate its own design — that would be circular. Instead:

1. **Use the external reference** — the principles in this file are derived from industry-standard skill design conventions (superpowers' `writing-skills`, Anthropic's skills documentation). Apply them as-is.
2. **External validation** — after making changes, step back and assess: does the skill still read coherently? Does the description still match what it does? Is the self-reference handling still correct?
3. **No bootstrapping** — do not look for an authoritative source "above" this skill. This skill defines its own standards. Apply them directly.
4. **If this rule set is insufficient** — the change is too fundamental for this skill. Use `brainstorming` to design the new approach, implement it, and update this self-reference section to reflect the new standard.

For all other skills, proceed normally with the rules below.

## Skill Structure

Every skill should use this file set:

```
skills/methodology/<skill-name>/
├── SKILL.md              # The skill content (required)
├── README.md             # Usage documentation (optional)
├── references/           # Reference files (optional)
└── scripts/              # Helper scripts (optional)
```

## SKILL.md Frontmatter

Every SKILL.md must start with frontmatter:

```yaml
---
name: <skill-name>
description: "Brief description of when to use this skill. Must be specific and actionable."
---
```

The description should answer: "When would an agent need this?"

## Content Guidelines

1. **First paragraph states the goal** — what the skill achieves, in one sentence
2. **Use a checklist** — agents create `todowrite` items from checklists. Every process step should be checkable
3. **Provide concrete examples** — show code, commands, expected output
4. **Include anti-patterns** — common mistakes and why they fail
5. **Be specific about when to use** — and when NOT to use
6. **Reference other methodology skills** — by name, to chain workflows

## Content Anti-Patterns

| Trap | Better Approach |
|------|----------------|
| Vague descriptions like "use when building features" | "Use before any implementation work — refines ideas into approved designs" |
| Instructions without examples | Always show code or command examples |
| No checklist | Every process skill must have a checklist |
| Telling what without telling why | Explain the rationale behind each rule |
| Assuming agent knowledge | Spell out what might seem obvious |

## Testing a Skill

Before committing a new or modified skill, verify:

1. **Loads correctly** — the skill content is valid markdown
2. **Checklist items are actionable** — each item is a single observable action
3. **No project-specific references** — skill is portable to any repo
4. **No tool-specific references** — use generic tool names, not platform-specific ones
5. **Chains correctly** — if the skill transitions to another skill, verify the referenced skill exists

## Commit Messages for Skill Changes

```
feat: add <skill-name> skill - <brief description>
fix: update <skill-name> - <what was wrong>
refactor: reorganize <skill-name> - <structural change>
```
