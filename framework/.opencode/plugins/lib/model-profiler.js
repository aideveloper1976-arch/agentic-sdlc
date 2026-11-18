const TIER_RULES = {
  "reasoning": {
    label: "Complex reasoning (good for complex implementation & design)",
    priority: 0,
    match: (m) => {
      const name = m.id.toLowerCase();
      if (m.provider === "openai") {
        return name.includes("gpt-5") || name.includes("o1") || name.includes("o3") || name.includes("claude");
      }
      if (m.provider === "anthropic") {
        return name.includes("opus") || name.includes("sonnet");
      }
      if (m.provider === "ollama") {
        const params = extractParamCount(m.id);
        return params >= 70 || name.includes("qwq") || name.includes("deepseek-r1") || name.includes("deepseek-v");
      }
      return false;
    },
  },
  "code-review": {
    label: "Code review (good for spec & quality review)",
    priority: 1,
    match: (m) => {
      const name = m.id.toLowerCase();
      if (m.provider === "openai") {
        return (name.includes("gpt-4") || name.includes("gpt-5") || name.includes("o1")) && !name.includes("mini");
      }
      if (m.provider === "anthropic") {
        return name.includes("sonnet") || name.includes("opus");
      }
      if (m.provider === "ollama") {
        const params = extractParamCount(m.id);
        return params >= 14 && !name.includes("embed") && !name.includes("nomic") && !name.includes("llama3.2");
      }
      return false;
    },
  },
  "code-capable": {
    label: "Code-capable (good for standard implementation)",
    priority: 2,
    match: (m) => {
      const name = m.id.toLowerCase();
      if (m.provider === "openai") {
        return (name.includes("gpt-4") || name.includes("o1-mini") || name.includes("gpt-5-mini"));
      }
      if (m.provider === "anthropic") {
        return name.includes("haiku") || name.includes("sonnet");
      }
      if (m.provider === "ollama") {
        const params = extractParamCount(m.id);
        return (params >= 14 && params < 70) || name.includes("mixtral") || name.includes("command-r") || name.includes("dbrx");
      }
      return false;
    },
  },
  "fast-local": {
    label: "Fast local (good for simple TDD tasks)",
    priority: 3,
    match: (m) => {
      if (m.provider !== "ollama") return false;
      const name = m.id.toLowerCase();
      const params = extractParamCount(m.id);
      if (params === null) return false;
      return params >= 3 && params <= 14 && !name.includes("deepseek") && !name.includes("qwq");
    },
  },
  "fast": {
    label: "Fast inference (any local model)",
    priority: 4,
    match: (m) =>
      m.provider === "ollama" ||
      (m.provider === "openai" && m.id.includes("mini")) ||
      (m.provider === "anthropic" && m.id.toLowerCase().includes("haiku")),
  },
};

const NAMED_MODEL_SIZES = {
  "llama3.2": 3, "llama3.1": 8, "llama3": 8, "llama2": 7,
  "qwen2.5": 7, "qwen2": 7, "qwen": 7,
  "mistral": 7, "mixtral": 8,
  "phi3": 3, "phi-3": 3, "phi": 2,
  "gemma2": 9, "gemma": 7,
  "deepseek-coder": 6, "deepseek-v2": 16, "deepseek-r1": 7,
  "codellama": 7, "codegemma": 7,
  "starcoder2": 7, "starcoder": 15,
  "command-r": 35, "dbrx": 132,
};

const NAMED_MODEL_PARAMS = {
  "deepseek-r1:70b": 70, "deepseek-r1:32b": 32, "deepseek-r1:14b": 14, "deepseek-r1:7b": 7, "deepseek-r1:1.5b": 1.5,
  "deepseek-v3": 671, "deepseek-v2": 236,
  "qwq:32b": 32, "qwq:latest": 32,
  "qwen2.5:72b": 72, "qwen2.5:32b": 32, "qwen2.5:14b": 14, "qwen2.5:7b": 7,
  "llama3.1:70b": 70, "llama3.1:8b": 8, "llama3.1:405b": 405,
  "mixtral:8x7b": 46, "mixtral:8x22b": 140,
  "command-r:35b": 35, "command-r-plus:104b": 104,
  "dbrx:132b": 132,
};

function extractParamCount(modelId) {
  const id = modelId.toLowerCase().replace(/:latest$/, "");
  if (NAMED_MODEL_PARAMS[id]) return NAMED_MODEL_PARAMS[id];
  const match = id.match(/(\d+)b$/);
  if (match) return parseInt(match[1], 10);
  for (const [prefix, size] of Object.entries(NAMED_MODEL_SIZES)) {
    if (id.startsWith(prefix) && !id.includes(":")) return size;
  }
  return null;
}

function classifyByMetadata(model) {
  const scored = [];
  for (const [tier, rule] of Object.entries(TIER_RULES)) {
    if (rule.match(model)) {
      scored.push({ tier, priority: rule.priority });
    }
  }
  scored.sort((a, b) => a.priority - b.priority);
  return scored.length > 0 ? scored[0].tier : "standard";
}

function hasUnifiedApi(model) {
  return model.provider === "openai";
}

export { extractParamCount, classifyByMetadata };

export class ModelProfiler {
  async classify(model) {
    const metadataTier = classifyByMetadata(model);
    const isLocal = model.provider === "ollama";
    const isOpenAI = model.provider === "openai";

    const tierPriority = ["reasoning", "code-review", "code-capable", "fast-local", "fast", "standard"];

    let tier = metadataTier;
    let confidence = "medium";

    if (isLocal && (tier === "fast-local" || tier === "fast")) {
      confidence = "high";
    } else if (isOpenAI && tierPriority.indexOf(tier) <= tierPriority.indexOf("code-capable")) {
      confidence = "high";
    }

    return {
      tier,
      confidence,
      label: TIER_RULES[tier]?.label || "Standard",
      hasUnifiedApi: hasUnifiedApi(model),
      isLocal,
      modelId: model.id,
    };
  }
}
