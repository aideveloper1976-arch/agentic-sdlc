---
name: writing-plans
description: "Use when you have an approved design or requirements for a multi-step task. Breaks the work into bite-sized implementation tasks with exact file paths, complete code, and verification steps. Supports dependency declarations for parallel execution."
---

# Writing Implementation Plans

Given an approved design or requirements, produce a detailed implementation plan where each task is a single focused action (2-5 minutes). Every task must include exact file paths, complete code, verification commands with expected output, and TDD steps.

**Announce:** "I am using the writing-plans skill to create the implementation plan."

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature>-plan.md`

## Scope Check

If the design covers multiple independent subsystems, suggest breaking it into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for:
- Design units with clear boundaries and well-defined interfaces
- Each file should have one clear responsibility
- Files that change together should live together
- In existing codebases, follow established patterns

## Dependency Declarations

Tasks that depend on earlier tasks MUST declare their dependencies. This enables the execution engine to run independent tasks in parallel.

```markdown
### Task 3: Frontend Component
**Depends on:** Task 1
```

Tasks without a `Depends on:` field are assumed independent and may run in parallel with any other independent task.

### Dependency Rules

- Only declare dependencies that are **strictly necessary** — a task cannot start until its dependency completes
- If multiple tasks depend on the same task, declare each one separately
- Circular dependencies are not allowed (Task A → Task B → Task A)
- If a task depends on several tasks, list them comma-separated: `**Depends on:** Task 1, Task 2`
- If a task's dependency is not another numbered task but external (e.g., "Project setup complete"), note it: `**Depends on:** Project setup`

## Bite-Sized Task Granularity

Each step is ONE action (2-5 minutes). No step should involve more than one logical change:

| Good (2-5 min each) | Bad (too large) |
|---------------------|-----------------|
| "Write the failing test" | "Implement the feature" |
| "Run it to verify it fails" | "Build the API and frontend" |
| "Write minimal code to pass" | "Add validation and error handling" |
| "Run tests to confirm they pass" | "Refactor the module" |
| "Commit" | |

## Plan Document Structure

```markdown
# [Feature Name] Implementation Plan

> **Goal:** [One sentence describing what this builds]
> **Architecture:** [2-3 sentences about approach]
> **Tech Stack:** [Key technologies/libraries]

---

### Task N: [Component Name]

**Depends on:** [Task X, Task Y — omit if none]

**Files:**
- Create: `exact/path/to/file.ext`
- Modify: `exact/path/to/existing.ext:123-145`
- Test: `tests/exact/path/to/test.ext`

- [ ] **Step 1: Write the failing test**
  ```python
  def test_specific_behavior():
      result = function(input)
      assert result == expected
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pytest tests/path/test.py::test_name -v`
  Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**
  ```python
  def function(input):
      return expected
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `pytest tests/path/test.py::test_name -v`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add tests/path/test.py src/path/file.py
  git commit -m "feat: add specific feature"
  ```
```

## No Placeholders

Every step must contain the actual content an engineer needs. These are PLAN FAILURES:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may read tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Self-Review

After writing the complete plan, look at it with fresh eyes:

1. **Spec coverage:** Can you point to a task for each section/requirement in the spec?
2. **Placeholder scan:** Search for any red-flag patterns from "No Placeholders" above. Fix them.
3. **Type consistency:** Do types, method signatures, and property names match across all tasks?
4. **Dependency order:** Are tasks ordered so earlier tasks do not depend on later ones? Are independent tasks correctly unmarked (no unnecessary `Depends on:`)?
5. **Circular dependency check:** Ensure no task depends on itself or creates a cycle.
6. **Completeness check:** Are all dependencies declared? If Task 3 imports from a file created in Task 1, Task 3 must depend on Task 1.

Fix any issues inline. No need to re-review — just fix and move on.

## Execution Handoff

After saving the plan, present the user with execution options:

> "Plan complete and saved to `docs/plans/<file>.md`. Two execution options:
>
> **1. Subagent-Driven (recommended)** — Fresh agent per task, parallel dispatch for independent tasks, two-stage review (spec then quality), auto-retry with model escalation, fast iteration
> **2. Inline Execution** — Execute tasks in this session, batch with checkpoints
>
> Which approach?"

If **Subagent-Driven** chosen: invoke `subagent-driven-development` skill
If **Inline Execution** chosen: invoke `executing-plans` skill
