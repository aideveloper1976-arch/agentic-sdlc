import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { ModelProfiler, classifyByMetadata } from "./model-profiler.js";

const CACHE_FILENAME = ".routing-cache.json";
const AGENT_DIRS = [".opencode/agents", ".opencode/agent"];
// Cheapest first: local models, then low-cost hosted, then frontier hosted.
const PROVIDER_PRIORITY = ["ollama", "deepseek", "gpt", "gemini", "claude", "other"];

// Lower rank = more capable. "standard" means the profiler could not classify the model.
const TIER_RANK = { reasoning: 0, "code-review": 1, "code-capable": 2, "fast-local": 3, fast: 4, standard: 5 };
// Weakest tier an agent of each model_strength may be routed to.
const STRENGTH_MAX_RANK = { orchestration: TIER_RANK.reasoning, complex: TIER_RANK["code-review"], standard: TIER_RANK["fast-local"], fast: TIER_RANK.standard };

const extractFrontmatter = (content) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const frontmatter = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    frontmatter[key] = value;
  }
  return frontmatter;
};

const splitModelRef = (modelRef) => {
  if (!modelRef || typeof modelRef !== "string") return null;
  const slashIdx = modelRef.indexOf("/");
  if (slashIdx <= 0 || slashIdx === modelRef.length - 1) return null;
  return { provider: modelRef.slice(0, slashIdx), id: modelRef.slice(slashIdx + 1) };
};

const normalizeModelRef = (provider, id) => {
  if (!provider || !id) return null;
  return `${provider}/${id}`;
};

const modelKey = (model) => `${model.provider}/${model.id}`;

const providerFamily = (model) => {
  const provider = String(model.provider || "").toLowerCase();
  const id = String(model.id || "").toLowerCase();
  if (provider.startsWith("ollama")) return "ollama";
  if (provider === "deepseek" || id.includes("deepseek")) return "deepseek";
  if (provider === "openai" || id.includes("gpt")) return "gpt";
  if (provider === "google" || provider === "gemini" || id.includes("gemini")) return "gemini";
  if (provider === "anthropic" || id.includes("claude")) return "claude";
  return "other";
};

const normalizePath = (p, homeDir) => {
  if (!p || typeof p !== "string") return null;
  let normalized = p.trim();
  if (!normalized) return null;
  if (normalized.startsWith("~/")) normalized = path.join(homeDir, normalized.slice(2));
  else if (normalized === "~") normalized = homeDir;
  return path.resolve(normalized);
};

export class ModelRouter {
  constructor(config, cachePath, pluginDir, projectDir) {
    this.config = config;
    this.cachePath = cachePath;
    this.pluginDir = pluginDir;
    this.projectDir = projectDir || path.dirname(path.dirname(pluginDir));
    this.routingTable = null;
    this.profiler = new ModelProfiler();
  }

  static async create(configPath) {
    const homeDir = os.homedir();
    const configDir = path.dirname(configPath);
    const pluginDir = path.resolve(configDir);
    const projectDir = path.dirname(path.dirname(pluginDir));
    const cachePath = path.join(pluginDir, CACHE_FILENAME);

    let config;
    try {
      const raw = fs.readFileSync(configPath, "utf8");
      config = JSON.parse(raw);
    } catch {
      config = {
        name: "methodology-engine",
        version: "1.0.0",
        tdd: { strictness: "hardcore", overrides: { "allow-prototype": false, "allow-reference-on-first-task": false, "delete-before-retype": true } },
        models: { providers: { ollama: { host: "http://localhost:11434", enabled: true }, openai: { enabled: true, apiKeyEnv: "OPENAI_API_KEY" } }, profiles: { default: { orchestrator: { provider: "openai", model: "gpt-5.5" }, implementer: { mechanical: { provider: "auto", capability: "fast-local" }, standard: { provider: "auto", capability: "code-capable" }, complex: { provider: "auto", capability: "reasoning" } }, reviewer: { spec: { provider: "auto", capability: "fast-local" }, quality: { provider: "auto", capability: "code-review" } } } } }
      };
    }

    return new ModelRouter(config, cachePath, pluginDir, projectDir);
  }

  discoverAgentFiles() {
    const agents = new Map();
    for (const relDir of AGENT_DIRS) {
      const dir = path.join(this.projectDir, relDir);
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
        const filePath = path.join(dir, entry.name);
        const name = path.basename(entry.name, ".md");
        const frontmatter = extractFrontmatter(fs.readFileSync(filePath, "utf8"));
        agents.set(name, { ...(agents.get(name) || {}), name, source: relDir, path: filePath, frontmatter });
      }
    }
    return agents;
  }

  loadProjectOpenCodeConfig() {
    const candidates = [
      path.join(this.projectDir, "opencode.json"),
      path.join(this.projectDir, ".opencode/opencode.json"),
    ];
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, "utf8"));
      } catch {
        return {};
      }
    }
    return {};
  }

  discoverAgents(openCodeConfig = {}) {
    const agents = this.discoverAgentFiles();
    for (const [name, agentConfig] of Object.entries(openCodeConfig.agent || {})) {
      const existing = agents.get(name) || { name };
      agents.set(name, { ...existing, name, config: agentConfig, frontmatter: { ...(existing.frontmatter || {}), ...agentConfig } });
    }
    return [...agents.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  discoverModels(openCodeConfig = undefined) {
    if (!openCodeConfig) openCodeConfig = this.loadProjectOpenCodeConfig();
    const models = new Map();
    const addModel = (modelRef, source, metadata = {}) => {
      const parsed = splitModelRef(modelRef);
      if (!parsed) return;
      const model = { ...parsed, ref: modelRef, source, ...metadata };
      models.set(modelKey(model), { ...(models.get(modelKey(model)) || {}), ...model });
    };

    addModel(openCodeConfig.model, "opencode.model");
    addModel(openCodeConfig.small_model, "opencode.small_model");

    for (const [provider, providerConfig] of Object.entries(openCodeConfig.provider || {})) {
      for (const [id, details] of Object.entries(providerConfig.models || {})) {
        addModel(normalizeModelRef(provider, id), `opencode.provider.${provider}.models`, { details });
      }
    }

    for (const [name, agentConfig] of Object.entries(openCodeConfig.agent || {})) {
      addModel(agentConfig?.model, `opencode.agent.${name}.model`);
    }

    // Agent frontmatter `model:` values are preferences, not proof a model is configured,
    // so they are not added here. selectModelForAgent() uses them only when they match a
    // configured model, or as a last-resort fallback when nothing is configured.

    return [...models.values()].sort((a, b) => modelKey(a).localeCompare(modelKey(b)));
  }

  modelTier(model) {
    return classifyByMetadata({ ...model, provider: String(model.provider || "").toLowerCase().startsWith("ollama") ? "ollama" : model.provider });
  }

  modelSupportsStrength(model, strength) {
    const id = String(model.id || "").toLowerCase();
    if (/(embed|embedding|audio|image|tts|whisper)/.test(id)) return false;
    const maxRank = STRENGTH_MAX_RANK[strength] ?? STRENGTH_MAX_RANK.standard;
    return (TIER_RANK[this.modelTier(model)] ?? TIER_RANK.standard) <= maxRank;
  }

  sortByCostPreference(a, b) {
    const providerDelta = PROVIDER_PRIORITY.indexOf(providerFamily(a)) - PROVIDER_PRIORITY.indexOf(providerFamily(b));
    if (providerDelta !== 0) return providerDelta;
    const aCost = a.details?.cost?.input ?? Number.POSITIVE_INFINITY;
    const bCost = b.details?.cost?.input ?? Number.POSITIVE_INFINITY;
    if (aCost !== bCost) return aCost - bCost;
    // Without price data, prefer the least capable model that still qualifies (a cost proxy).
    const rankDelta = (TIER_RANK[this.modelTier(b)] ?? 5) - (TIER_RANK[this.modelTier(a)] ?? 5);
    if (rankDelta !== 0) return rankDelta;
    return modelKey(a).localeCompare(modelKey(b));
  }

  selectModelForAgent(agent, availableModels, openCodeConfig = {}) {
    const frontmatter = agent.frontmatter || {};
    // The orchestrator plans the whole run, so it always needs a reasoning-tier model.
    const strength = frontmatter.model_type === "orchestration" ? "orchestration" : (frontmatter.model_strength || "standard");

    // If the agent frontmatter explicitly specifies a model, use it first
    if (frontmatter.model) {
      const exactMatch = availableModels.find(
        (m) => m.ref === frontmatter.model || `${m.provider}/${m.id}` === frontmatter.model
      );
      if (exactMatch) {
        return { model: exactMatch.ref, source: `${agent.source}/${agent.name}.md frontmatter`, model_type: frontmatter.model_type || "unknown", model_strength: strength };
      }
      // Match by model id (allows provider-agnostic match like "deepseek-v4-flash")
      const idMatch = availableModels.find((m) => m.id === frontmatter.model || frontmatter.model.endsWith(`/${m.id}`));
      if (idMatch) {
        return { model: idMatch.ref, source: `${agent.source}/${agent.name}.md frontmatter (id match)`, model_type: frontmatter.model_type || "unknown", model_strength: strength };
      }
    }

    const candidates = availableModels
      .filter((model) => this.modelSupportsStrength(model, strength))
      .sort((a, b) => this.sortByCostPreference(a, b));
    const selected = candidates[0];
    if (selected) return { model: selected.ref, source: "model-router", model_type: frontmatter.model_type || "unknown", model_strength: strength };
    return { model: frontmatter.model || openCodeConfig.model || null, source: frontmatter.model ? "agent-fallback" : "opencode-default", model_type: frontmatter.model_type || "unknown", model_strength: strength };
  }

  buildAgentAssignments(openCodeConfig = {}) {
    const models = this.discoverModels(openCodeConfig);
    const agents = this.discoverAgents(openCodeConfig);
    const assignments = {};
    for (const agent of agents) {
      const assignment = this.selectModelForAgent(agent, models, openCodeConfig);
      if (assignment.model) assignments[agent.name] = assignment;
    }
    return { builtAt: new Date().toISOString(), models, agents, assignments };
  }

  applyAgentAssignments(openCodeConfig = {}) {
    const result = this.buildAgentAssignments(openCodeConfig);
    openCodeConfig.agent = openCodeConfig.agent || {};
    for (const [agentName, assignment] of Object.entries(result.assignments)) {
      openCodeConfig.agent[agentName] = openCodeConfig.agent[agentName] || {};
      openCodeConfig.agent[agentName].model = assignment.model;
    }
    return result;
  }

  computeModelHash(models) {
    const ids = models.map((m) => `${m.provider}:${m.id}`).sort().join(",");
    return crypto.createHash("sha256").update(ids).digest("hex");
  }

  async profileModels(models) {
    const profiled = [];
    for (const model of models) {
      const info = await this.profiler.classify(model);
      profiled.push({ ...model, tier: info.tier, isLocal: info.isLocal, tierInfo: info });
    }
    return profiled;
  }

  buildRoutingTable(profiledModels, activeProfile) {
    const profile = this.config.models?.profiles?.[activeProfile] || this.config.models?.profiles?.default;
    if (!profile) return null;

    const byCost = (list) => [...list].sort((a, b) => this.sortByCostPreference(a, b));
    const resolveCapability = (capability) => {
      const exact = byCost(profiledModels.filter((m) => m.tier === capability));
      if (exact.length > 0) return exact[0];
      // No model in that tier: take the nearest tier, preferring a more capable one.
      const want = TIER_RANK[capability] ?? TIER_RANK.standard;
      const ranked = profiledModels
        .map((m) => ({ m, rank: TIER_RANK[m.tier] ?? TIER_RANK.standard }))
        .sort((a, b) => {
          const da = a.rank <= want ? want - a.rank : 100 + a.rank - want;
          const db = b.rank <= want ? want - b.rank : 100 + b.rank - want;
          return da - db || this.sortByCostPreference(a.m, b.m);
        });
      return ranked.length > 0 ? ranked[0].m : null;
    };

    const pickFastestLocal = (profiledModels) => {
      const local = profiledModels.filter((m) => m.isLocal && (m.tier === "fast" || m.tier === "fast-local" || m.tier === "standard"));
      return local.length > 0 ? byCost(local)[0] : null;
    };

    const resolveEntry = (entry, defaultCapability) => {
      if (!entry) entry = {};
      if (entry.model && entry.model !== "auto") {
        const match = profiledModels.find((m) => m.id === entry.model);
        if (match) return match;
      }
      if (entry.capability) {
        if (entry.capability === "fast-local") {
          const best = pickFastestLocal(profiledModels);
          if (best) return best;
        }
        const match = resolveCapability(entry.capability);
        if (match) return match;
      }
      if (entry.provider && entry.provider !== "auto") {
        const match = profiledModels.find((m) => m.provider === entry.provider);
        if (match) return match;
      }
      if (defaultCapability) {
        const match = resolveCapability(defaultCapability);
        if (match) return match;
      }
      return profiledModels.length > 0 ? profiledModels[0] : null;
    };

    return {
      builtAt: new Date().toISOString(),
      activeProfile: activeProfile || "default",
      orchestrator: resolveEntry(profile.orchestrator, "reasoning"),
      implementer: {
        mechanical: resolveEntry(profile.implementer?.mechanical, "fast-local"),
        standard: resolveEntry(profile.implementer?.standard, "code-capable"),
        complex: resolveEntry(profile.implementer?.complex, "reasoning"),
      },
      reviewer: {
        spec: resolveEntry(profile.reviewer?.spec, "code-capable"),
        quality: resolveEntry(profile.reviewer?.quality, "code-review"),
      },
    };
  }

  routingTableToMarkdown(table) {
    const fmt = (m) => {
      if (!m) return "Not available";
      return `${m.provider}/${m.id} ${m.isLocal ? "(local)" : "(remote)"}`;
    };
    return [
      "| Task Type | Model | Provider |",
      "|---|---|---|",
      `| Orchestrator | ${fmt(table.orchestrator)} | ${table.orchestrator?.provider || "-"} |`,
      `| Implementer (mechanical) | ${fmt(table.implementer.mechanical)} | ${table.implementer.mechanical?.provider || "-"} |`,
      `| Implementer (standard) | ${fmt(table.implementer.standard)} | ${table.implementer.standard?.provider || "-"} |`,
      `| Implementer (complex) | ${fmt(table.implementer.complex)} | ${table.implementer.complex?.provider || "-"} |`,
      `| Spec Reviewer | ${fmt(table.reviewer.spec)} | ${table.reviewer.spec?.provider || "-"} |`,
      `| Quality Reviewer | ${fmt(table.reviewer.quality)} | ${table.reviewer.quality?.provider || "-"} |`,
    ].join("\n");
  }

  agentAssignmentsToMarkdown(assignments) {
    const rows = [
      "| Agent | Model Type | Strength | Assigned Model | Source |",
      "|---|---|---|---|---|",
    ];
    for (const [agentName, assignment] of Object.entries(assignments || {}).sort(([a], [b]) => a.localeCompare(b))) {
      rows.push(`| ${agentName} | ${assignment.model_type || "-"} | ${assignment.model_strength || "-"} | ${assignment.model || "-"} | ${assignment.source || "-"} |`);
    }
    return rows.join("\n");
  }

  loadCachedRouting() {
    try {
      return JSON.parse(fs.readFileSync(this.cachePath, "utf8"));
    } catch {
      return null;
    }
  }

  saveCachedRouting(hash, table) {
    const cache = { modelHash: hash, routingTable: table, cachedAt: new Date().toISOString() };
    fs.writeFileSync(this.cachePath, JSON.stringify(cache, null, 2), "utf8");
  }

  needsReconfirmation(cached, newHash) {
    if (!cached) return true;
    if (cached.modelHash !== newHash) return true;
    return false;
  }

  async resolve({ activeProfile, onConfirm }) {
    const availableModels = this.discoverModels();
    const modelHash = this.computeModelHash(availableModels);
    const cached = this.loadCachedRouting();

    if (!this.needsReconfirmation(cached, modelHash)) {
      this.routingTable = cached.routingTable;
      return this.routingTable;
    }

    const profiled = await this.profileModels(availableModels);
    const table = this.buildRoutingTable(profiled, activeProfile);
    if (!table) throw new Error("Could not build routing table");

    const markdown = this.routingTableToMarkdown(table);

    const accepted = await onConfirm(markdown);
    if (accepted) {
      this.saveCachedRouting(modelHash, table);
      this.routingTable = table;
    } else {
      throw new Error("Model routing configuration rejected by user");
    }

    return this.routingTable;
  }

  getRoutingTable() {
    return this.routingTable;
  }

  getTddConfig() {
    return this.config.tdd || { strictness: "hardcore", overrides: { "allow-prototype": false, "allow-reference-on-first-task": false, "delete-before-retype": true } };
  }
}
