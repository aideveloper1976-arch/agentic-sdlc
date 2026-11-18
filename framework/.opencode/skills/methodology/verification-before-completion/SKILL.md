---
name: verification-before-completion
description: "Use after applying a fix or making a change. Confirms the fix actually resolves the issue before marking complete."
---

# Verification Before Completion

After applying a fix or making a change, verify the issue is actually resolved before marking the task complete. A fix is not done until you have evidence it works.

## Checklist

- [ ] Run the specific test that reproduces the original issue
- [ ] Run the full test suite to confirm no regressions
- [ ] Verify the fix in the same environment where the issue was first observed
- [ ] Document what was wrong, what was changed, and how it was verified

## Verification Steps

### 1. Confirm the Fix

Run the exact reproduction case that demonstrated the issue before the fix:
- If you wrote a failing test in Phase 1 of debugging, run that test
- If the issue was observed live, replicate the same conditions

### 2. Check for Regressions

Run the full test suite. A fix that breaks other things is not done.

### 3. Verify in Original Context

If possible, verify the fix in the same environment where the issue was first observed. Environment differences can mask incomplete fixes.

### 4. Document

Record:
- **What was wrong** — root cause
- **What was changed** — files and logic modified
- **How it was verified** — test names, manual steps, evidence

## Anti-Patterns

| Trap | Why It Fails |
|------|-------------|
| "It works on my machine" | Environment differences can hide issues |
| "The tests pass" without running the reproduction case | Tests might not cover the exact scenario |
| "I am confident it is fixed" without verification | Confidence is not evidence |
| Verifying only the happy path | Edge cases might still be broken |
