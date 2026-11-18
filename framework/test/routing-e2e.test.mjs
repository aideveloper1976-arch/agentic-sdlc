// End-to-end checks of model routing through the real plugin hooks, in a throwaway project.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frameworkDir = path.resolve(here, "..", ".opencode");

async function setupProject({ opencode, stripAgentPins = true, pins = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "routing-"));
  fs.cpSync(frameworkDir, path.join(dir, ".opencode"), { recursive: true });
  fs.rmSync(path.join(dir, ".opencode/plugins/.routing-cache.json"), { force: true });
  const agentsDir = path.join(dir, ".opencode/agents");
  for (const f of fs.readdirSync(agentsDir)) {
    const p = path.join(agentsDir, f);
    let body = fs.readFileSync(p, "utf8");
    if (stripAgentPins) body = body.replace(/^model: .*\n/m, "");
    const name = f.replace(/\.md$/, "");
    if (pins[name]) body = body.replace(/^model: .*\n/m, "").replace(/^---\n/, `---\nmodel: ${pins[name]}\n`);
    fs.writeFileSync(p, body);
  }
  fs.writeFileSync(path.join(dir, "opencode.json"), JSON.stringify(opencode));
  const { MethodologyEnginePlugin: Plugin } = await import(path.join(dir, ".opencode/plugins/methodology-engine.js") + `?v=${dir}`);
  const hooks = await Plugin({ directory: dir });
  const cfg = structuredClone(opencode);
  await hooks.config(cfg);
  const assigned = Object.fromEntries(Object.entries(cfg.agent || {}).map(([k, v]) => [k, v.model]));
  const msgs = { messages: [{ info: { role: "user" }, parts: [{ type: "text", text: "hi" }] }] };
  await hooks["experimental.chat.messages.transform"]({}, msgs);
  const cache = JSON.parse(fs.readFileSync(path.join(dir, ".opencode/plugins/.routing-cache.json"), "utf8"));
  return { assigned, table: cache.routingTable, bootstrap: msgs.messages[0].parts[0].text };
}

const anthropicOnly = {
  model: "anthropic/claude-sonnet-4-5",
  provider: { anthropic: { models: { "claude-opus-4-5": {}, "claude-sonnet-4-5": {}, "claude-haiku-4-5": {} } } },
};
const mixed = {
  model: "anthropic/claude-sonnet-4-5",
  provider: {
    anthropic: { models: { "claude-opus-4-5": {}, "claude-sonnet-4-5": {}, "claude-haiku-4-5": {} } },
    ollama: { models: { "llama3.1:8b": {} } },
  },
};

test("Anthropic-only: orchestrator gets Opus, complex agents Sonnet, standard agents Haiku", async () => {
  const { assigned } = await setupProject({ opencode: anthropicOnly });
  assert.equal(assigned["master-orchestrator"], "anthropic/claude-opus-4-5");
  assert.equal(assigned["architect"], "anthropic/claude-sonnet-4-5"); // model_strength: complex
  assert.equal(assigned["story-writer"], "anthropic/claude-haiku-4-5"); // model_strength: standard
});

test("agents are not all routed to the same model", async () => {
  const { assigned } = await setupProject({ opencode: anthropicOnly });
  assert.ok(new Set(Object.values(assigned)).size >= 3);
});

test("routing table uses capability tiers and marks local models", async () => {
  const { table, bootstrap } = await setupProject({ opencode: mixed });
  assert.equal(`${table.orchestrator.provider}/${table.orchestrator.id}`, "anthropic/claude-opus-4-5");
  assert.equal(`${table.implementer.mechanical.provider}/${table.implementer.mechanical.id}`, "ollama/llama3.1:8b");
  assert.equal(table.implementer.mechanical.isLocal, true);
  assert.equal(`${table.reviewer.quality.provider}/${table.reviewer.quality.id}`, "anthropic/claude-sonnet-4-5");
  assert.match(bootstrap, /ollama\/llama3\.1:8b \(local\)/);
});

test("a frontmatter pin to a model that is not configured is ignored", async () => {
  const { assigned } = await setupProject({ opencode: anthropicOnly, pins: { architect: "deepseek/deepseek-v4-flash" } });
  assert.equal(assigned["architect"], "anthropic/claude-sonnet-4-5");
});

test("a frontmatter pin to a configured model wins", async () => {
  const { assigned } = await setupProject({ opencode: anthropicOnly, pins: { architect: "anthropic/claude-opus-4-5" } });
  assert.equal(assigned["architect"], "anthropic/claude-opus-4-5");
});

test("cheap local models are preferred for agents they can handle", async () => {
  const { assigned } = await setupProject({ opencode: mixed });
  assert.equal(assigned["story-writer"], "ollama/llama3.1:8b");
  assert.equal(assigned["master-orchestrator"], "anthropic/claude-opus-4-5");
});

test("every export is a function (OpenCode refuses to load a plugin module otherwise)", async () => {
  const mod = await import(path.join(frameworkDir, "plugins/methodology-engine.js"));
  for (const [name, value] of Object.entries(mod)) assert.equal(typeof value, "function", `export ${name}`);
});
