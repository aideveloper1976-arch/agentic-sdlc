---
name: test-driven-development
description: "Use when implementing any feature or bug fix, BEFORE writing implementation code. Enforces RED-GREEN-REFACTOR cycle."
---

# Test-Driven Development

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

The current TDD strictness is configured in `.opencode/plugins/methodology-config.json`.

**If strictness is `hardcore`** (default): Code written before a failing test MUST be deleted. Start over. No exceptions. Do not keep it as "reference". Do not adapt it while writing tests. Do not look at it. Delete means delete.

**If strictness is `standard`**: You may set aside code written before tests, but you must still write the failing test first and re-implement from scratch while referencing the set-aside code.

## Core Cycle

```
RED:   Write a failing test
GREEN: Write minimal code to pass
REFACTOR: Clean up while keeping tests green
```

### RED — Write Failing Test

Write one minimal test that demonstrates the desired behavior.

Requirements:
- One behavior per test
- Clear, descriptive name
- Use real code — mocks only when unavoidable (e.g., external APIs)

```
test("rejects empty email", async () => {
  const result = await submitForm({ email: "" });
  expect(result.error).toBe("Email required");
});
```

### Verify RED — Watch It Fail

**MANDATORY.** Run the test. Confirm:
- Test fails (does not error)
- Failure message is as expected
- Failure reason is "feature missing", not "typo in test"

If the test passes, you are testing existing behavior. Fix the test.
If the test errors, fix the error and re-run until it fails correctly.

### GREEN — Write Minimal Code

Write the simplest code that makes the test pass. Do NOT add:
- Features not required by the test
- Refactoring of other code
- "Improvements" beyond what the test demands
- Error handling not yet tested

```
function submitForm(data) {
  if (!data.email?.trim()) {
    return { error: "Email required" };
  }
  // ... rest
}
```

### Verify GREEN — Watch It Pass

**MANDATORY.** Run the test. Confirm:
- Test passes
- Other tests still pass
- Output is clean (no errors, warnings)

If the test fails, fix the code — not the test.
If other tests fail, fix them now.

### REFACTOR — Clean Up

Only after GREEN:
- Remove duplication
- Improve names
- Extract helpers
- Keep tests green throughout

Do not add new behavior during refactor.

### Repeat

Next test → RED → verify → GREEN → verify → REFACTOR → next test

## Why Order Matters

**"I'll write tests after to verify it works"**
Tests written after code pass immediately. Passing immediately proves nothing. You never saw it catch the bug. You tested what you built, not what you should have built.

**"Deleting X hours of work is wasteful"**
Sunk cost fallacy. The time is already gone. Your choice now:
- Delete and rewrite with TDD (X more hours, high confidence)
- Keep it and add tests after (30 min, low confidence, likely bugs)

The "waste" is keeping code you cannot trust.

**"TDD is dogmatic, being pragmatic means adapting"**
TDD IS pragmatic. It finds bugs before commit. It prevents regressions. It documents behavior. It enables refactoring. "Pragmatic" shortcuts = debugging in production = slower.

## Good Tests vs Bad Tests

| Quality | Good | Bad |
|---------|------|-----|
| Minimal | One thing per test | `test("validates email and domain and...")` |
| Clear | Name describes behavior | `test("test1")` |
| Shows intent | Demonstrates API usage | Tests internal implementation |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record. Can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keep unverified code = debt. |
| "Keep as reference" | You'll adapt it. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration code. Start with TDD. |
| "Test hard = design unclear" | Listen to the test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD is faster than debugging. |
| "Existing code has no tests" | You are improving it. Add tests for existing code. |

## Verification Checklist

Before marking work complete, verify:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] **No existing functionality was removed** — reviewed `git diff` to confirm no accidental deletions of real logic, error handling, edge cases, or fallback code
- [ ] All tests pass
- [ ] Output is clean (no errors, warnings)
- [ ] Edge cases and errors are covered

Cannot check all boxes? You skipped TDD.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask your human partner. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup is huge | Extract helpers. Still complex? Simplify design. |
