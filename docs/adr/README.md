# Architecture Decision Records

Short records of the decisions that shape this project, in the
[Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

| # | Decision | Status |
|---|---|---|
| [0001](0001-one-subagent-per-phase.md) | Run each lifecycle phase in a fresh subagent and hand back only a checkpoint path | Accepted |
| [0002](0002-tools-over-prompts.md) | Put correctness-critical work behind MCP tools, not prompts | Accepted |
| [0003](0003-evidence-and-human-gates.md) | Gate progress on evidence files and three human sign-offs | Accepted |
| [0004](0004-capability-tiered-model-routing.md) | Route each agent to the cheapest model that meets its capability tier | Accepted |
| [0005](0005-monorepo-and-security-posture.md) | One npm-workspaces monorepo, no secrets in config, allowlisted execution | Accepted |
