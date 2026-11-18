---
name: subagent-driven-development
description: "Use when executing an implementation plan with independent tasks. Dispatches fresh subagents per task in parallel batches with two-stage review (spec compliance then code quality), auto-retry with model escalation, and dynamic agent creation."
---

# Subagent-Driven Development

Execute an implementation plan by dispatching fresh subagents per task in **parallel batches**, with two-stage review after each: spec compliance review first, then code quality review. Independent tasks run concurrently up to a configurable limit. Failed tasks auto-retry with escalating model tiers.

**Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed. They should never inherit your session's history — you construct exactly what they need. This preserves your own context for coordination work.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) + parallel dispatch + auto-retry = high quality, fast iteration.

**Continuous execution:** Do NOT pause to check in with the user between tasks. Execute all tasks without stopping. The only reasons to stop are: a task exceeds the retry limit and escalates to the user, ambiguity genuinely prevents progress, or all tasks complete.

## When to Use

Use this skill when:
- You have an approved implementation plan with clear tasks
- Tasks are mostly independent (can run in parallel, or dependencies are explicitly declared)
- You are working in a single session

If tasks are tightly coupled with no parallelism possible, use `executing-plans` instead.

## Configuration

The following settings are read from `.opencode/plugins/methodology-config.json`:

| Setting | Default | Purpose |
|---------|---------|---------|
| `execution.max_concurrent_subagents` | `10` | Maximum parallel subagents per batch |
| `execution.retry_limit` | `3` | Max retry attempts before escalating to user |

## Checklist

- [ ] Read the plan file and extract all tasks with full text, context, and dependency declarations
- [ ] Build dependency graph: identify which tasks depend on which others
- [ ] Create a `todowrite` with all tasks (status: pending)
- [ ] **Batch loop:** identify ready tasks (all dependencies met) → dispatch up to `max_concurrent_subagents` implementers in parallel
- [ ] Collect all implementer reports from the batch
- [ ] Dispatch spec compliance reviews for all completed tasks (parallel)
- [ ] Dispatch code quality reviews for all passed tasks (parallel)
- [ ] Apply auto-retry logic for any BLOCKED/NEEDS_CONTEXT tasks
- [ ] Mark batch tasks complete
- [ ] Repeat batch loop until all tasks done
- [ ] Present completion summary to user

## Process

### Step 1: Read the Plan and Build Dependency Graph

Read the plan file. Extract ALL tasks with their full text and any shared context. For each task, parse the `Depends on:` field (if present) to determine dependencies.

```markdown
### Task 2: API Route
**Depends on:** Task 1
**Files:**
- Create: `src/api/route.ts`
```

If no `Depends on:` is specified, the task is assumed to have no dependencies and can run in the first batch.

Build a dependency graph:
- Track which tasks each task depends on
- Track which tasks depend on each task (reverse dependencies)
- A task is **ready** when all its dependencies are marked **completed**

### Step 2: Create Task Tracking

Create a `todowrite` with all tasks listed. Each task starts as `pending`. Update to `in_progress` when dispatched, `completed` when all reviews pass.

Each todowrite item should include tracking metadata:
```
Task 1: Implement API route
  Status: pending
  Retry count: 0
  Model tier: mechanical
```

### Step 3: Parallel Batch Dispatch (The Core Loop)

```
WHILE tasks remain uncompleted:
  1. Find all tasks whose dependencies are all completed AND status is "pending"
  2. Select up to config.max_concurrent_subagents (default 10) tasks from the ready pool
  3. Dispatch implementer subagents for ALL selected tasks CONCURRENTLY
     (fire all task() calls without awaiting individual results)
  4. Wait for ALL implementer reports from this batch
  5. For each completed task:
     a. Dispatch spec compliance review (parallel across batch)
     b. If spec passes: dispatch code quality review (parallel across batch)
     c. If all reviews pass: mark task completed
     d. If reviews fail: dispatch implementer to fix, re-review
  6. For each BLOCKED/NEEDS_CONTEXT task: apply auto-retry logic (see Step 5)
  7. If any tasks remain after retry handling, loop back to step 1
```

**Dispatch pattern:**
```
// Batch dispatch — fire all at once, collect results later
const batch = [
  task(description="Implement Task 1", prompt=..., subagent_type=...),
  task(description="Implement Task 3", prompt=..., subagent_type=...),
  task(description="Implement Task 5", prompt=..., subagent_type=...),
];
const results = await Promise.all(batch);  // or equivalent
```

#### Model Selection

Use the appropriate model for each task based on the plugin's routing table:

| Task Type | Default Model Tier |
|-----------|-------------------|
| Mechanical (1-2 files, clear spec) | `implementer.mechanical` |
| Standard (multi-file, integration) | `implementer.standard` |
| Complex (design judgment, broad codebase) | `implementer.complex` |

The routing table is injected at session start. Each retry escalates to the next tier.

#### Model Visibility

When filling in subagent prompt templates, include the selected model so the
subagent can announce itself and the controller can log which model was used:

| Variable | Source | Example |
|----------|--------|---------|
| `{MODEL_ID}` | Model ID from routing table entry | `llama3.1:8b` or `gpt-4.1-mini` |
| `{TIER_LABEL}` | Human-readable tier label | `Fast local (mechanical)` or `Remote (standard)` |

This makes it visible to the user which model processed each task, which is
useful for debugging cost, speed, and quality issues.

#### Dynamic Agent Fallback

If no predefined agent in `.opencode/agents/` matches the task's requirements, use the agent factory to create a dynamic agent:

```
task(
  description="Implement <task-name>",
  prompt=<implementer prompt>,
  subagent_type="dynamic-<task-hash>"  // auto-generated by agent-factory.js
)
```

The agent factory generates a focused agent definition in `.opencode/agents/dynamic/<task-hash>.md` with the correct model tier and a tailored system prompt. These persist for the session and can be reused if a similar task appears.

### Step 4: Parallel Reviews

After all implementers in a batch complete, dispatch reviews concurrently:

```
// All spec reviews in parallel
const specReviews = completedTasks.map(task =>
  task(description=`Spec review: ${task.name}`, prompt=specPrompt(task))
);
await Promise.all(specReviews);

// All quality reviews in parallel
const qualityReviews = specPassedTasks.map(task =>
  task(description=`Quality review: ${task.name}`, prompt=qualityPrompt(task))
);
await Promise.all(qualityReviews);
```

If a review fails, the task goes back to the implementer (still tracked, not re-dispatched until the current batch finishes).

### Step 5: Auto-Retry Logic

When a subagent reports a non-DONE status, apply this retry policy automatically:

| Status | Attempt ≤ retry_limit | Attempt > retry_limit |
|--------|----------------------|----------------------|
| **NEEDS_CONTEXT** | Provide missing context, re-dispatch with **same model** | Escalate to user |
| **BLOCKED** | Re-dispatch with **next-higher model tier** | Escalate to user |
| **DONE_WITH_CONCERNS** | Read concerns. If minor → proceed. If blocking → treat as BLOCKED | N/A |

**Model escalation chain:**
```
mechanical → standard → complex → user escalation
```

Each retry attempt:
1. Increments the task's retry counter
2. Selects the next model tier (mechanical=1, standard=2, complex=3)
3. Re-builds the implementer prompt with retry context (previous error, attempt number)
4. Re-dispatches the subagent with the higher-tier model

**Retry context passed to re-dispatched subagent:**
```
Retry context:
- Attempt: 2/3
- Previous error: "Module X not found"
- Previous model: ollama/llama3.1:8b
- Current model: ollama/qwen2.5:14b
- What was already tried: installed missing dependency
```

**Escalation to user includes:**
- Task description
- What was attempted (all models tried, error messages)
- Suggested resolution
- User decides: skip task, re-plan, or manual fix

### Step 6: Mark Complete and Loop

Update the `todowrite` for each completed task in the batch to "completed". If uncompleted tasks remain, return to Step 3 (batch loop).

### Step 7: Completion

When all tasks are complete, present a summary:
- Tasks completed
- Tasks that required retries (count and which models were escalated to)
- Dynamic agents created (if any)
- Total files changed
- Tests added/passing
- Any remaining concerns
- Next step: invoke `finishing-a-development-branch` skill

## Auto-Retry Reference

### Retry Flow Diagram
```
Implementer reports BLOCKED
  → retry_count < limit?
    → YES:
        → next model tier available?
          → YES: re-dispatch with higher-tier model
          → NO:  escalate to user
    → NO:
        → escalate to user with full summary

Implementer reports NEEDS_CONTEXT
  → retry_count < limit?
    → YES: add context, re-dispatch with SAME model
    → NO:  escalate to user

Implementer reports DONE_WITH_CONCERNS
  → concerns are blocking?
    → YES: treat as BLOCKED
    → NO:  proceed to review
```

### Retry Checklist

For each task that requires retry, verify:
- [ ] Retry count incremented in todowrite
- [ ] Next model tier selected
- [ ] Retry context block added to implementer prompt
- [ ] Subagent re-dispatched
- [ ] If escalated: user notified with full context

## Efficiency Notes

- **Provide complete context upfront** — include full file contents the implementer needs to avoid round-trips
- **Curate, don't dump** — only include what is relevant to the specific task
- **Pre-fill answers to likely questions** — if the task has ambiguity, resolve it in the prompt before dispatching
- **Batch independent tasks** — the parallel dispatcher handles this automatically, but plan authors should declare dependencies explicitly via `Depends on:` for maximum parallelism
- **Monitor the concurrency cap** — if you have 15 independent tasks and `max_concurrent_subagents=10`, the first batch processes 10 and the second batch processes 5
