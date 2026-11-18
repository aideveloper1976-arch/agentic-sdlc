import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AgentFactory } from "../.opencode/plugins/lib/agent-factory.js";

const fakeRouter = {
  getRoutingTable: () => null,
  config: { models: { profiles: { default: {} } } },
};

function factory() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-factory-"));
  return { dir, f: new AgentFactory(dir, fakeRouter) };
}

test("the same task description reuses the same dynamic agent", () => {
  const { f } = factory();
  const a = f.getAgent("Write a migration for the audit table", "code-capable");
  const b = f.getAgent("Write a migration for the audit table", "code-capable");
  assert.equal(a, b);
  assert.match(a, /^dynamic-/);
});

test("different tasks produce different agents", () => {
  const { f } = factory();
  assert.notEqual(f.getAgent("task one", "fast"), f.getAgent("task two", "fast"));
});

test("generated agent file is a subagent with ask-by-default bash permissions", () => {
  const { dir, f } = factory();
  const id = f.getAgent("Refactor the notification service", "reasoning");
  const body = fs.readFileSync(path.join(dir, "agents/dynamic", `${id}.md`), "utf8");
  assert.match(body, /^---\n/);
  assert.match(body, /mode: subagent/);
  assert.match(body, /"\*": ask/);
});
