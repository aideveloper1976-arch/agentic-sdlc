/**
 * agent-factory.js
 *
 * Creates temporary agent definitions on the fly for tasks that don't fit
 * any predefined role. Generated agents persist to .opencode/agents/dynamic/
 * for reuse within and across sessions.
 */
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DYNAMIC_AGENTS_DIR = "agents/dynamic";

export class AgentFactory {
  constructor(opencodeDir, router) {
    this.openDir = opencodeDir;
    this.agentsDir = path.join(opencodeDir, DYNAMIC_AGENTS_DIR);
    this.router = router;
  }

  /**
   * Create or retrieve a dynamic agent for the given task.
   * Uses a hash of the task description so identical task types reuse the same agent.
   */
  getAgent(taskDescription, capabilityTier, retryContext) {
    const hash = this._hashDescription(taskDescription);
    const agentId = `dynamic-${hash}`;
    const filePath = path.join(this.agentsDir, `${agentId}.md`);

    if (fs.existsSync(filePath)) {
      return agentId;
    }

    const model = this._resolveModel(capabilityTier, retryContext);
    const systemPrompt = this._buildPrompt(taskDescription, retryContext);

    const content = [
      "---",
      `description: "Temporary agent for: ${taskDescription.slice(0, 80).replace(/"/g, "'")}"`,
      "mode: subagent",
      `model: ${model.provider}/${model.id}`,
      "permission:",
      "  edit: ask",
      "  bash:",
      '    "*": ask',
      '    "npm test*": allow',
      '    "npm run test*": allow',
      '    "npm run build*": allow',
      '    "git status*": allow',
      '    "git diff*": allow',
      '    "git add*": allow',
      '    "git commit*": allow',
      "---",
      "",
      systemPrompt,
    ].join("\n");

    fs.mkdirSync(this.agentsDir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");

    return agentId;
  }

  /**
   * Remove a specific dynamic agent file.
   */
  cleanupAgent(agentId) {
    const filePath = path.join(this.agentsDir, `${agentId}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Remove ALL dynamic agent files.
   */
  cleanupAll() {
    if (!fs.existsSync(this.agentsDir)) return;
    const files = fs.readdirSync(this.agentsDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        fs.unlinkSync(path.join(this.agentsDir, file));
      }
    }
  }

  /**
   * List all currently persisted dynamic agents.
   */
  listAgents() {
    if (!fs.existsSync(this.agentsDir)) return [];
    return fs.readdirSync(this.agentsDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({
        id: f.replace(".md", ""),
        path: path.join(this.agentsDir, f),
        description: this._readDescription(path.join(this.agentsDir, f)),
      }));
  }

  _hashDescription(description) {
    return crypto.createHash("sha1").update(description).digest("hex").slice(0, 8);
  }

  _resolveModel(capabilityTier, retryContext) {
    const table = this.router.getRoutingTable();
    if (!table) {
      return { provider: "openai", id: "gpt-4.1-mini" };
    }

    // If retrying, escalate through tiers
    const retryCount = retryContext?.attempt || 0;
    const tiers = ["mechanical", "standard", "complex"];
    const tierIndex = Math.min(
      Math.max(tiers.indexOf(capabilityTier || "mechanical"), 0) + retryCount,
      tiers.length - 1
    );
    const tier = tiers[tierIndex];

    // Map implementer tier names to routing table keys
    const tierMap = {
      mechanical: "mechanical",
      standard: "standard",
      complex: "complex",
    };

    const resolved = table.implementer?.[tierMap[tier]];
    if (resolved) {
      return { provider: resolved.provider, id: resolved.id };
    }

    return { provider: "openai", id: "gpt-4.1-mini" };
  }

  _buildPrompt(taskDescription, retryContext) {
    const lines = [
      `You are a temporary agent created for a specific task.`,
      ``,
      `Your task: ${taskDescription}`,
      ``,
      `Follow TDD strictly: write a failing test first, then implement, then verify.`,
      `Make minimal changes. Only implement what the task requires.`,
      `Commit your changes with a descriptive message when done.`,
    ];

    if (retryContext) {
      lines.push(``, `--- Retry Context ---`);
      lines.push(`Attempt: ${retryContext.attempt}/${retryContext.limit}`);
      if (retryContext.previousError) lines.push(`Previous error: ${retryContext.previousError}`);
      if (retryContext.previousModel) lines.push(`Previous model: ${retryContext.previousModel}`);
      if (retryContext.currentModel) lines.push(`Current model: ${retryContext.currentModel}`);
      if (retryContext.whatWasTried) lines.push(`What was already tried: ${retryContext.whatWasTried}`);
    }

    return lines.join("\n");
  }

  _readDescription(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const match = content.match(/^description: "(.+)"$/m);
      return match ? match[1] : "Dynamic agent";
    } catch {
      return "Dynamic agent";
    }
  }
}
