---
name: systematic-debugging
description: "Use when diagnosing a bug, failure, or unexpected behavior. Follows a 4-phase root cause process before making any changes."
---

# Systematic Debugging

Follow this 4-phase process when diagnosing any bug, failure, or unexpected behavior. Do NOT jump to fixes before completing all four phases.

## The Four Phases

```
1. REPRODUCE → 2. HYPOTHESIZE → 3. ISOLATE → 4. FIX & VERIFY
```

## Checklist

- [ ] Phase 1: Reproduce and characterize the failure
- [ ] Phase 2: Form a specific hypothesis about root cause
- [ ] Phase 3: Prove hypothesis with minimal experiment
- [ ] Phase 4: Fix and verify with isolation test
- [ ] Run existing tests to confirm no regressions

## Phase 1: Reproduce & Characterize

Before changing anything, understand the failure:

1. **Get a reliable reproduction** — what exact input/action triggers the failure?
2. **Characterize the failure** — what happens vs what should happen?
3. **Check for patterns** — does it happen consistently? Under what conditions?
4. **Gather evidence** — error messages, stack traces, logs, screenshots, test output

**Write a failing test that reproduces the bug.** This becomes your regression test.

Do NOT skip to Phase 2 until you can reproduce the failure on demand.

## Phase 2: Form Hypothesis

Based on the evidence, form a specific hypothesis about the root cause:

1. **State the hypothesis clearly** — "The cause is X because of Y"
2. **Explain the chain** — how does the root cause produce the observed failure?
3. **Consider multiple hypotheses** — list 2-3 possibilities, rank by likelihood
4. **Pick the most likely** — what would you test first?

## Phase 3: Isolate & Prove

Design a minimal experiment to prove or disprove your hypothesis:

1. **Add a targeted diagnostic** — log, assertion, or test that isolates the suspected cause
2. **Run it** — does the evidence support or refute your hypothesis?
3. **If disproven** — return to Phase 2 with the next hypothesis
4. **If supported** — you have identified the root cause

## Phase 4: Fix & Verify

Only now do you make changes:

1. **Write a failing test** that demonstrates the bug (if you did not already in Phase 1)
2. **Confirm it fails for the expected reason**
3. **Apply the minimal fix** — address the root cause, not the symptom
4. **Confirm the test passes**
5. **Run all existing tests** — ensure no regressions
6. **Commit** with a message that references the bug

## Anti-Patterns

| Trap | Why It Fails |
|------|-------------|
| Changing things before understanding the cause | You might fix a symptom, not the root cause |
| Making multiple changes at once | You will not know which change fixed it |
| "This looks like a similar bug I saw before" | Similar symptoms can have different causes |
| Skipping the reproduction step | "It only happens in production" means you cannot verify the fix |
| Fixing without a test | Someone (or you) will reintroduce this bug |

## Common Techniques

- **Binary search** — comment out half the code, see if bug persists. Narrow down iteratively.
- **Minimal reproduction** — strip away everything unnecessary. What is the smallest input that triggers it?
- **Diff isolation** — if the bug appeared after a change, diff the changes and test each one.
- **Log instrumentation** — add targeted logging at each step of the suspected path.
- **Assertion testing** — add assertions at key points to verify assumptions.
