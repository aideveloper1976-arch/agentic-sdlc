import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { ModelRouter } from "../.opencode/plugins/lib/model-router.js";

const router = new ModelRouter({ models: { profiles: {} } }, path.join(os.tmpdir(), "rc.json"), path.join(os.tmpdir(), "x", ".opencode", "plugins"));

test("model-set hash is order-independent", () => {
  const a = [{ provider: "openai", id: "gpt-5.5" }, { provider: "ollama", id: "llama3.1:8b" }];
  assert.equal(router.computeModelHash(a), router.computeModelHash([...a].reverse()));
});

test("model-set hash changes when a model is added", () => {
  const a = [{ provider: "openai", id: "gpt-5.5" }];
  const b = [...a, { provider: "anthropic", id: "claude-sonnet-4-5" }];
  assert.notEqual(router.computeModelHash(a), router.computeModelHash(b));
});

test("discovers models referenced in an OpenCode config", () => {
  const models = router.discoverModels({
    model: "openai/gpt-5.5",
    small_model: "ollama/llama3.1:8b",
    provider: { anthropic: { models: { "claude-sonnet-4-5": {} } } },
  });
  const refs = models.map((m) => `${m.provider}/${m.id}`);
  assert.ok(refs.includes("openai/gpt-5.5"));
  assert.ok(refs.includes("ollama/llama3.1:8b"));
  assert.ok(refs.includes("anthropic/claude-sonnet-4-5"));
});
