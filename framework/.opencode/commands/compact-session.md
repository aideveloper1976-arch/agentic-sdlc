---
description: Request session compaction to free context window space for long-running workflows
agent: master-orchestrator
---

Session compaction is available when context is running low. Compaction summarizes older messages while preserving critical context.

To compact this session, use OpenCode's built-in session compaction mechanism.

## What to do

1. The plugin has registered context hints that preserve critical information (methodology rules, project structure, AGENTS.md references).
2. If you are approaching the context limit, tell the user they can:
   - Run `/compact` in the OpenCode CLI to trigger manual compaction.
   - Or continue working — OpenCode will auto-compact when the limit is approached.
3. Compaction preserves:
   - Methodology framework rules (skill-first, TDD, user instructions)
   - The current phase context from AGENTS.md
   - Recent messages (last ~20% of conversation)
   - All file artifacts (checkpoints, designs, code) remain on disk untouched

## Manual trigger

If the session is too large and compaction fails, the user should:
1. Save any unsaved work to files.
2. Type `/compact` in the OpenCode CLI.
3. The session will be summarized and compacted.
4. After compaction, resume work. The agent will have a fresh context with key context preserved.
