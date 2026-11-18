---
name: brainstorming
description: "Use before any creative work — creating features, building components, adding functionality, or modifying behavior. Refines ideas into designs through structured dialogue before implementation."
---

# Brainstorming: Ideas Into Designs

Turn rough ideas into approved designs through structured, collaborative dialogue. Do NOT write any code, scaffold any project, or take any implementation action until you have presented a design AND the user has approved it. This applies to EVERY task regardless of perceived simplicity.

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every meaningful change goes through this process. A UI tweak, a config change, a single-function utility — all of them. "Simple" changes are where unexamined assumptions cause the most wasted work. The design can be brief (a few sentences for truly trivial changes), but you MUST present it and get approval.

## Checklist

Create a `todowrite` for each of these items and complete them in order:

1. **Explore project context** — check files, docs, recent commits, existing patterns
2. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
3. **Propose 2-3 approaches** — with trade-offs and your recommendation
4. **Present design** — in sections scaled to complexity, get approval after each section
5. **Write design doc** — save to `docs/designs/YYYY-MM-DD-<feature>-design.md`
6. **Spec self-review** — check for placeholders, contradictions, ambiguity, scope issues
7. **User reviews written spec** — ask user to review before proceeding
8. **Transition to implementation** — invoke `writing-plans` skill

## Process Details

### 1. Explore Project Context

Before asking anything, understand the existing codebase:
- Check relevant files and directories
- Look at recent commits for context
- Understand existing patterns and conventions
- Note any constraints the architecture imposes

### 2. Ask Clarifying Questions

- One question per message — do not overwhelm
- Prefer multiple-choice when possible
- Focus on: purpose, constraints, success criteria
- If the request describes multiple independent subsystems, flag this immediately. Help decompose into sub-projects before diving into details.

### 3. Propose Approaches

- Present 2-3 different approaches with trade-offs
- Lead with your recommended option and explain why
- Cover: complexity, maintainability, performance, testability

### 4. Present Design

- Scale each section to its complexity (few sentences to ~300 words)
- Ask after each section whether it looks right
- Cover: architecture, components, data flow, error handling, testing
- Design for isolation: each unit has one clear purpose and a well-defined interface

### 5. Write Design Doc

- Save to `docs/designs/YYYY-MM-DD-<feature>-design.md`
- Create the directory if it does not exist
- Commit the design document to git

### 6. Spec Self-Review

After writing the spec, look at it with fresh eyes:
1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections? Fix them.
2. **Internal consistency:** Do any sections contradict each other?
3. **Scope check:** Focused enough for a single implementation plan?
4. **Ambiguity check:** Could any requirement be interpreted two different ways? Pin it down.

### 7. User Review Gate

Ask: "Spec written and committed to `<path>`. Please review it and let me know if you want changes before we start the implementation plan."

Wait for the user. If they request changes, fix them and re-run the self-review loop. Only proceed once approved.

### 8. Transition

Invoke the `writing-plans` skill. Do NOT invoke any other skill — writing-plans is the next step.

## Key Principles

- **One question at a time** — do not overwhelm with multiple questions
- **Multiple choice preferred** — easier to answer than open-ended when possible
- **YAGNI ruthlessly** — remove unnecessary features from all designs
- **Explore alternatives** — always propose 2-3 approaches before settling
- **Incremental validation** — present design sections, get approval, move on
- **Be flexible** — go back and clarify when something does not make sense

## Working in Existing Codebases

- Explore the current structure before proposing changes
- Follow existing patterns
- Where existing code has problems affecting the work, include targeted improvements in the design
- Do not propose unrelated refactoring — stay focused on what serves the current goal

## Process Flow

```
Explore context → Ask questions (one at a time) → Propose 2-3 approaches
→ Present design sections (approve each) → Write design doc
→ Spec self-review → User reviews spec → Invoke writing-plans
```

The terminal state is invoking `writing-plans`. Do NOT invoke any implementation skill.
