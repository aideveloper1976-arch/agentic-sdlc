---
name: executing-plans
description: "Use as a lightweight alternative to subagent-driven-development when tasks are tightly coupled or require staying in a single session. Executes plan tasks inline with batch checkpoints."
---

# Executing Plans (Inline)

Execute an implementation plan directly in the current session without dispatching separate subagents. Use this when tasks are tightly coupled (each depends on the previous) or when subagent overhead is not justified.

**When to use this instead of subagent-driven-development:**
- Tasks share files or state (cannot be done independently)
- Plan has only 1-3 small tasks
- You need to maintain context across all tasks

**When to use subagent-driven-development instead:**
- Tasks are independent
- Each task can be verified in isolation
- You want two-stage review (spec then quality)

## Checklist

- [ ] Read the plan file
- [ ] Create a `todowrite` with all tasks
- [ ] Execute tasks sequentially, following TDD for each
- [ ] After every 2-3 tasks (or each task if preferred), present a checkpoint to the user
- [ ] All tests pass before marking complete
- [ ] Present completion summary

## Process

### Step 1: Read the Plan

Read the plan file. Understand the full scope before starting.

### Step 2: Create Task Tracking

Create a `todowrite` with all tasks listed. Each task goes through: in_progress → verify → completed.

### Step 3: Execute Tasks

For each task:
1. Follow the task steps exactly as written in the plan
2. Follow TDD: write failing test → verify fail → implement → verify pass → refactor
3. Commit after each task
4. Update `todowrite` to completed

### Step 4: Checkpoints

After every 2-3 tasks (or each task if the user prefers), present a checkpoint:
- What was completed
- Tests status
- Any deviations from the plan
- Ask if the user wants to adjust course

### Step 5: Completion

When all tasks are complete:
- Run the full test suite
- Present completion summary
- Invoke `requesting-code-review` skill before handing off
