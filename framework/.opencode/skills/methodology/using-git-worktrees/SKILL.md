---
name: using-git-worktrees
description: "Use when working on parallel isolated branches. Creates a separate working directory for each branch."
---

# Using Git Worktrees

Git worktrees allow you to check out multiple branches simultaneously in separate directories, all sharing the same `.git` directory. This enables isolated development on parallel features without stashing or cloning.

## When to Use

- Working on multiple independent features concurrently
- Need to make a hotfix on main while mid-feature on another branch
- Want an isolated workspace for each task without switching branches

## When Not to Use

- Working on a single feature (adds unnecessary complexity)
- Short tasks that can be completed in one sitting

## Workflow

### 1. Create a Worktree

```bash
git worktree add ../<branch-name> <branch-name>
```

This creates `../<branch-name>` as a working directory with `<branch-name>` checked out.

### 2. Work in the Worktree

```bash
cd ../<branch-name>
# make changes, write tests, commit
git commit -m "feat: ..."
```

The worktree is fully isolated — changes in the worktree do not affect the main repository or other worktrees.

### 3. Run Setup in Worktree

If the project needs build steps:
```bash
cd ../<branch-name>
npm install    # or equivalent
npm run build  # or equivalent
npm test       # verify baseline
```

### 4. Work Through the Standard Workflow

Within the worktree, the normal development flow applies:
- brainstorming → writing-plans → test-driven-development → subagent-driven-development

### 5. Finish the Branch

When work is complete:
```bash
# Push from the worktree
cd ../<branch-name>
git push origin <branch-name>

# Clean up
cd /original/repo
git worktree remove ../<branch-name>
```

Then invoke the `finishing-a-development-branch` skill.

## Commands Reference

| Action | Command |
|--------|---------|
| Create worktree | `git worktree add <path> <branch>` |
| List worktrees | `git worktree list` |
| Remove worktree | `git worktree remove <path>` |
| Prune stale references | `git worktree prune` |

## Notes

- Worktrees share the `.git` directory — they are not independent clones
- Each worktree has its own `node_modules`, build output, etc.
- Disk usage is higher than a single working tree
- Commits made in a worktree are visible in the main repo immediately
