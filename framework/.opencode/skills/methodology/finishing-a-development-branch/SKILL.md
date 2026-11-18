---
name: finishing-a-development-branch
description: "Use when implementation tasks are complete. Verifies everything is in order and presents branch completion options to the user."
---

# Finishing a Development Branch

When all implementation tasks are complete, run final verification and present the user with completion options.

## Checklist

- [ ] Run the full test suite — all tests pass
- [ ] Verify no debug artifacts remain (console.log, TODOs, dead code)
- [ ] Review the diff for any unintended changes
- [ ] Confirm commits are well-structured (one logical change per commit)
- [ ] Push the branch to remote

## Verification Steps

### 1. Run Full Test Suite

```bash
npm test  # or equivalent
```

All tests must pass. A failing test means something is incomplete.

### 2. Check for Debug Artifacts

Search for:
- `console.log`, `print()`, `debugger` statements
- `TODO`, `FIXME`, `HACK` comments
- Commented-out code
- Unused imports or variables (run the linter)

### 3. Review the Diff

```bash
git diff main...HEAD
```

Look for:
- Unrelated changes that should not be in this branch
- Files modified by accident (whitespace, formatting)
- Missing tests for new functionality

### 4. Review Commit Structure

```bash
git log --oneline main..HEAD
```

Each commit should contain one logical change. If commits are messy, consider squashing.

### 5. Push

```bash
git push origin <branch-name>
```

## Present Options to User

When all checks pass, present these options:

> "Implementation is complete. All tests pass and the branch has been verified. Options:
>
> **1. Merge to main branch** — fast-forward or squash merge
> **2. Create GitHub PR** — open a pull request for review
> **3. Keep worktree** — leave the branch for later
> **4. Delete branch** — discard this branch entirely
>
> Which approach?"

| Option | When to Recommend |
|--------|-------------------|
| Merge to main | Small change, no review needed |
| Create GitHub PR | Any change that benefits from review |
| Keep worktree | Feature is paused, not finished |
| Delete branch | Experiment or wrong approach |
