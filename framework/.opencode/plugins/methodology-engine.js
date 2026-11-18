/**
 * methodology-engine.js
 *
 * Generic development methodology plugin for OpenCode.
 * Provides:
 *  - Model auto-discovery and capability-based routing
 *  - Bootstrap injection (forces skill checking before every action)
 *  - TDD enforcement configuration
 *  - Skills path auto-registration
 *
 * Portable — no project-specific references. Can be copied to any repo.
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ModelRouter } from "./lib/model-router.js";
import { AgentFactory } from "./lib/agent-factory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILENAME = "methodology-config.json";
const SKILL_DIR = path.resolve(__dirname, "../skills");

let _bootstrapCache = undefined;

const extractFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };
  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};
  for (const line of frontmatterStr.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
      frontmatter[key] = value;
    }
  }
  return { frontmatter, content: body };
};

const ensureConfigExists = (configPath) => {
  if (fs.existsSync(configPath)) return;
  const defaultConfig = {
    name: "methodology-engine",
    version: "1.0.0",
    tdd: { strictness: "hardcore", overrides: { "allow-prototype": false, "allow-reference-on-first-task": false, "delete-before-retype": true } },
    models: {
      providers: {
        ollama: { host: "http://localhost:11434", enabled: true },
        openai: { enabled: true, apiKeyEnv: "OPENAI_API_KEY" },
      },
      profiles: {
        "default": {
          orchestrator: { provider: "openai", model: "gpt-5.5" },
          implementer: {
            mechanical: { provider: "auto", capability: "fast-local" },
            standard: { provider: "auto", capability: "code-capable" },
            complex: { provider: "auto", capability: "reasoning" },
          },
          reviewer: {
            spec: { provider: "auto", capability: "fast-local" },
            quality: { provider: "auto", capability: "code-review" },
          },
        },
        "local-only": {
          orchestrator: { provider: "ollama", model: "auto" },
          implementer: {
            mechanical: { provider: "ollama", capability: "fast" },
            standard: { provider: "ollama", capability: "code-capable" },
            complex: { provider: "ollama", capability: "reasoning" },
          },
          reviewer: {
            spec: { provider: "ollama", capability: "fast" },
            quality: { provider: "ollama", capability: "code-capable" },
          },
        },
      },
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
};

const readConfig = (configPath) => {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
};

export const MethodologyEnginePlugin = async (ctx) => {
  const configPath = path.join(ctx.directory, ".opencode/plugins", CONFIG_FILENAME);
  ensureConfigExists(configPath);
  const config = readConfig(configPath);

  const router = await ModelRouter.create(configPath);
  const agentFactory = new AgentFactory(path.join(ctx.directory, ".opencode"), router);

  const execCfg = config?.execution || { max_concurrent_subagents: 10, retry_limit: 3 };

  const getBootstrapContent = () => {
    if (_bootstrapCache !== undefined) return _bootstrapCache;

    const skillPath = path.join(SKILL_DIR, "methodology/using-framework/SKILL.md");
    if (!fs.existsSync(skillPath)) {
      _bootstrapCache = null;
      return null;
    }

    const fullContent = fs.readFileSync(skillPath, "utf8");
    const { content } = extractFrontmatter(fullContent);

    const tddCfg = config?.tdd || { strictness: "hardcore", overrides: {} };
    const tddNote = tddCfg.strictness === "hardcore"
      ? "**IMPORTANT:** TDD is configured in HARDCORE mode. Code written before a failing test MUST be deleted."
      : "TDD is configured in standard mode. Write tests first, but reference code is allowed if approved.";

    // Collect available skills for reference
    let skillIndex = "";
    try {
      const methodologyDir = path.join(SKILL_DIR, "methodology");
      if (fs.existsSync(methodologyDir)) {
        const entries = fs.readdirSync(methodologyDir, { withFileTypes: true });
        const skills = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
        skillIndex = skills.length > 0 ? `Available methodology skills: ${skills.map((s) => `\`${s}\``).join(", ")}.` : "";
      }
    } catch {
      skillIndex = "";
    }

    _bootstrapCache = [
      "## Methodology Framework",
      "",
      `${tddNote}`,
      "",
      "**Rules:** Check skills before every action. Process skills first (brainstorming, debugging). User instructions override skills.",
      skillIndex,
      "",
      "**Red flags:** \"I need more context first\", \"This doesn't need a skill\", \"I remember this skill\" — these mean STOP and invoke the skill anyway.",
      "",
      "**Tool mapping:** `TodoWrite`→`todowrite`, `Task` with subagents→`task` with `subagent_type`, `Skill`→native `skill` tool.",
      "",
      "**Commands — suggest the right one for long-running tasks to prevent context overflow:**",
      "- Bug/defect → `/fix-issue <description>` (diagnose→TDD→verify→commit, subagent dispatch)",
      "- UAT feedback/screen tweak/small change → `/quick-change <description>` (implement→verify→commit, subagent dispatch)",
      "- New feature → `/run-full-sdlc <idea>` (full 18-phase lifecycle, subagent dispatch)",
      "- Existing story → `/build-story <story>` (build+test+review for one story)",
    ].filter(Boolean).join("\n");

    return _bootstrapCache;
  };

  // Model routing: resolve and build routing table
  // The user confirmation flow happens via the bootstrap content
  let routingTable = null;
  let agentRouting = null;

  const ensureRoutingTable = async () => {
    const acceptPrompt = async (markdown) => {
      // We store the routing table for injection into the bootstrap
      // The user confirms via the agent, which is instructed by the bootstrap skill
      return true; // Will be confirmed by user through agent interaction
    };
    routingTable = await router.resolve({ onConfirm: acceptPrompt, activeProfile: config?.models?.activeProfile || "default" });
    return routingTable;
  };

  return {
    config: async (cfg) => {
      // Register methodology skills path so OpenCode discovers them
      cfg.skills = cfg.skills || {};
      cfg.skills.paths = cfg.skills.paths || [];
      const methodologySkillsPath = path.join(SKILL_DIR, "methodology");
      if (fs.existsSync(methodologySkillsPath) && !cfg.skills.paths.includes(methodologySkillsPath)) {
        cfg.skills.paths.push(methodologySkillsPath);
      }

      // Option A model routing: mutate the live OpenCode config at startup.
      // Agent files remain declarative and are not rewritten at runtime.
      agentRouting = router.applyAgentAssignments(cfg);
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages.length) return;

      const firstUser = output.messages.find((m) => m.info.role === "user");
      if (!firstUser || !firstUser.parts.length) return;

      // Guard: skip if first user message already contains bootstrap
      if (firstUser.parts.some((p) => p.type === "text" && p.text.includes("EXTREMELY_IMPORTANT"))) return;

      // Resolve routing table (cached, will use cache on subsequent calls)
      const table = await ensureRoutingTable();
      const execConfigMd = [
        "### Execution Configuration",
        "",
        `| Setting | Value |`,
        `|---|---|`,
        `| Max concurrent subagents | ${execCfg.max_concurrent_subagents} |`,
        `| Auto-retry limit | ${execCfg.retry_limit} |`,
        "",
        "To change these values, edit `execution` section in `.opencode/plugins/methodology-config.json`.",
        "",
      ].join("\n");

      const routingMarkdown = table ? [
        "### Model Routing Configuration",
        "",
        "The following models are assigned to development tasks:",
        "",
        router.routingTableToMarkdown(table),
        "",
        "To change these assignments, edit `.opencode/plugins/methodology-config.json` and restart the session.",
        "",
        "To switch profiles, set `models.activeProfile` in `.opencode/plugins/methodology-config.json` and restart the session.",
        "",
        "### Agent Model Assignments",
        "",
        "The following concrete models were assigned by reading OpenCode config and agent frontmatter:",
        "",
        router.agentAssignmentsToMarkdown(agentRouting?.assignments || {}),
        "",
        "To change agent routing, edit `model_type` / `model_strength` in `.opencode/agents/*.md`, OpenCode provider models in `opencode.json`, or agent fallback `model` values, then restart OpenCode.",
        "",
        "**IMPORTANT:** EXTREMELY_IMPORTANT",
      ].join("\n") : "**IMPORTANT:** EXTREMELY_IMPORTANT\n";

      const ref = firstUser.parts[0];
      firstUser.parts.unshift(
        { ...ref, type: "text", text: `${bootstrap}\n\n${routingMarkdown}\n\n${execConfigMd}` },
      );
    },

    "experimental.session.compacting": async (_input, output) => {
      output.context = output.context || [];
      const projectContext = [
        "Project uses methodology skills in .opencode/skills/methodology/",
        "Skills are loaded via the `skill` tool. Critical rules: check skills before every action, TDD required, user instructions override.",
        "AGENTS.md defines the SDLC phases and agent mapping.",
      ];
      for (const ctx of projectContext) {
        if (!output.context.includes(ctx)) {
          output.context.push(ctx);
        }
      }
    },
  };
};

