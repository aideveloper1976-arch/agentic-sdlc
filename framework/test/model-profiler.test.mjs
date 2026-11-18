import test from "node:test";
import assert from "node:assert/strict";
import { ModelProfiler, extractParamCount } from "../.opencode/plugins/lib/model-profiler.js";

const profiler = new ModelProfiler();
const tierOf = async (provider, id) => (await profiler.classify({ provider, id })).tier;

test("extracts parameter counts from local model ids", () => {
  assert.equal(extractParamCount("qwen2.5:72b"), 72);
  assert.equal(extractParamCount("llama3.1:8b"), 8);
  assert.equal(extractParamCount("mixtral:8x7b"), 46);
  assert.equal(extractParamCount("unknown-model"), null);
});

test("large local models are classed as reasoning, small ones as fast-local", async () => {
  assert.equal(await tierOf("ollama", "qwen2.5:72b"), "reasoning");
  assert.equal(await tierOf("ollama", "llama3.1:8b"), "fast-local");
});

test("mid-size local models are code-review capable", async () => {
  assert.equal(await tierOf("ollama", "qwen2.5:14b"), "code-review");
});

test("hosted frontier models are classed as reasoning", async () => {
  assert.equal(await tierOf("openai", "gpt-5.5"), "reasoning");
  assert.equal(await tierOf("anthropic", "claude-opus-4-5"), "reasoning");
});

test("small hosted models fall into cheaper tiers", async () => {
  assert.equal(await tierOf("openai", "gpt-4.1-mini"), "code-capable");
  assert.equal(await tierOf("anthropic", "claude-haiku-4-5"), "code-capable");
});

test("local models report high confidence for fast tiers", async () => {
  const r = await profiler.classify({ provider: "ollama", id: "llama3.1:8b" });
  assert.equal(r.isLocal, true);
  assert.equal(r.confidence, "high");
});
