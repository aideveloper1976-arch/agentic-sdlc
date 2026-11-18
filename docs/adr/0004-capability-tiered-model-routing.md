# 0004. Capability-tiered model routing

## Status
Accepted

## Context
A run invokes fifteen agents many times. Sending every call to a frontier model is expensive;
sending everything to a small model fails on orchestration and architecture.

## Decision
Classify each configured model into a tier (reasoning, code-review, code-capable, fast-local,
fast). Each agent declares what it needs (`model_strength`, or `model_type: orchestration` for
reasoning only). In OpenCode's `config` hook, assign each agent the cheapest qualifying model:
local first, then DeepSeek, GPT, Gemini, Claude, then by known price, then the least capable
model that still qualifies. An agent's own `model:` pin wins only if that model is configured.

## Consequences
- Routine agents can run on a local model at no API cost; orchestration stays on a strong model.
- Classification is name-based, so new model families need a rule in `model-profiler.js`.
- Verified with unit tests, end-to-end hook tests and a live OpenCode run; see
  [model-routing.md](../model-routing.md).
