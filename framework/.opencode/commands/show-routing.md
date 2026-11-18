---
description: Display current model routing, including task-tier routing and OpenCode agent model assignments
agent: master-orchestrator
---

Display the current model routing configuration loaded at session start.

The routing output has two sections:

1. The task-tier routing table for orchestrator, implementer, and reviewer roles.
2. Agent-level model assignments applied by the methodology plugin config hook.

Agent assignments are sourced from OpenCode configuration and agent files, not
provider API discovery. The router reads:

- `opencode.json` top-level `model`
- `opencode.json` top-level `small_model`, when present
- `opencode.json.provider.<provider>.models`
- `opencode.json.agent.<name>.model`, when present
- `.opencode/agents/*.md` and `.opencode/agent/*.md` frontmatter `model:` fallback values

Agents are discovered from inline `opencode.json.agent`, `.opencode/agents/*.md`,
and `.opencode/agent/*.md`. For each agent, the router reads frontmatter
`model_type` and `model_strength`, selects the cheapest capable model using the
preference order Ollama → DeepSeek → GPT → Gemini → Claude (frontmatter `model:`
wins only if that model is configured), and mutates
`cfg.agent[agentName].model` at runtime. Agent files are not rewritten during
assignment.

To view the routing table, read the first message of this session where the
bootstrap injected the routing configuration. If the table is not visible in
the current context, read the routing cache file at:

`.opencode/plugins/.routing-cache.json`

The cached routing table was last built at the `cachedAt` timestamp and contains
the model assignment for each task-tier role. Agent-level assignments are shown
in the bootstrap message under "Agent Model Assignments" and are recomputed from
the OpenCode config and agent frontmatter when OpenCode starts.
