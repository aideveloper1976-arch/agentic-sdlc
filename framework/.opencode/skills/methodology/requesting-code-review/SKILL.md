---
name: requesting-code-review
description: "Use before asking for a code review. Runs a pre-review checklist to catch common issues before the reviewer sees the code."
---

# Requesting Code Review

Before submitting code for review, run this pre-review checklist. Catching issues yourself saves the reviewer's time and speeds up the feedback loop.

## Checklist

Run through each item before asking for review. Document any items you skipped and why.

- [ ] **All tests pass** — run the full test suite
- [ ] **No failing tests were commented out or deleted**
- [ ] **Changes are minimal** — no unrelated refactoring, formatting changes, or dead code
- [ ] **No debug artifacts** — console.log, print, debugger statements, TODO comments, commented-out code
- [ ] **Error paths are tested** — not just the happy path
- [ ] **Public API is documented** — functions, classes, and exports have clear names and types
- [ ] **No hardcoded values** — magic numbers/strings are extracted to named constants
- [ ] **No security red flags** — no injection risks, hardcoded secrets, missing auth checks
- [ ] **Commit messages are descriptive** — each commit explains what and why
- [ ] **Diff is focused** — each commit contains one logical change

## What to Include in the Review Request

Provide the reviewer with:
1. **What this change does** — one sentence
2. **What to focus on** — specific areas where you want feedback
3. **The commit range or branch** — what to review
4. **Any concerns you already have** — be upfront about areas you are unsure about

## Common Issues to Catch Before Requesting

| Issue | How to Check |
|-------|-------------|
| Unused imports/variables | Run linter |
| Type errors | Run type checker |
| Missing edge cases | Review test coverage |
| Overly complex logic | Read your own diff critically |
| Naming that could be clearer | Explain each name aloud |
