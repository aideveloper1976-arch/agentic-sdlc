# Platform Tool Mapping

When loading skills written for other coding agent platforms, use this mapping table to translate tool references to OpenCode equivalents.

## Tool Equivalents

| Claude Code | OpenCode |
|-------------|----------|
| `Skill` | `skill` (native) |
| `TodoWrite` | `todowrite` |
| `Task` (subagent dispatch) | `task` with `subagent_type` |
| `Bash` | `bash` |
| `Read` | `read` |
| `Write` | `write` |
| `Edit` | `edit` |
| `Grep` | `grep` |
| `Glob` | `glob` |

## Key Pattern: Subagent Dispatch

When a skill says "dispatch a subagent to implement this task", use OpenCode's `task` tool:

```
task(description="Implement X", prompt="detailed instructions", subagent_type="backend-dev")
```

The subagent types available are defined in `.opencode/agents/` and can vary by project. Check the project's `AGENTS.md` for the list.
