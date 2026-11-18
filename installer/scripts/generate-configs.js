#!/usr/bin/env node
// Generates/merges MCP server configuration for four clients — Claude Code,
// OpenCode, VS Code, and Zed — from tools.manifest.json + the installed
// tool paths + the values already collected in .env.
//
// IMPORTANT: unlike opencode's original hand-written config (which used
// literal placeholder values, not env-var indirection), none of the four
// client formats reliably support macro-expansion of an external .env at
// server-spawn time across all versions. To guarantee servers actually
// start with real credentials, this script embeds the ACTUAL values read
// from .env directly into each generated config file. Those files therefore
// contain secrets in plaintext — see the warnings this script prints, and
// keep them out of version control.
//
// Usage:
//   node generate-configs.js --manifest <path> --env <path> --target <dir> [--clients claude,opencode,vscode,zed]

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const out = { clients: "claude,opencode,vscode,zed" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--manifest") out.manifest = argv[++i];
    else if (a === "--env") out.env = argv[++i];
    else if (a === "--target") out.target = argv[++i];
    else if (a === "--clients") out.clients = argv[++i];
  }
  if (!out.manifest || !out.env || !out.target) {
    console.error("Usage: generate-configs.js --manifest <path> --env <path> --target <dir> [--clients a,b,c]");
    process.exit(1);
  }
  return out;
}

function parseEnvFile(envPath) {
  const map = {};
  if (!fs.existsSync(envPath)) return map;
  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (/^[A-Z_][A-Z0-9_]*$/.test(key)) map[key] = value;
  }
  return map;
}

function buildServerList(manifest, envMap) {
  const servers = [];
  for (const t of manifest.tools) {
    if (!t.mcpKey) continue;
    const entryFile = [t.dir, "dist", "index.js"].join("/");
    const env = {};
    for (const v of t.envVars || []) env[v] = envMap[v] !== undefined ? envMap[v] : "";
    servers.push({ key: t.mcpKey, command: "node", args: [entryFile], env });
  }
  servers.push({
    key: "chrome-devtools",
    command: "npx",
    args: ["-y", "chrome-devtools-mcp@latest", "--isolated", "--no-usage-statistics", "--no-performance-crux", "--slim"],
    env: {},
  });
  return servers;
}

function readJsonIfValid(filePath) {
  if (!fs.existsSync(filePath)) return { data: {}, existed: false, valid: true };
  try {
    return { data: JSON.parse(fs.readFileSync(filePath, "utf8")), existed: true, valid: true };
  } catch (e) {
    return { data: null, existed: true, valid: false, error: e.message };
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

// ---- Claude Code: <target>/.mcp.json ----
function generateClaude(target, servers) {
  const file = path.join(target, ".mcp.json");
  const { data, valid } = readJsonIfValid(file);
  if (!valid) {
    console.warn(`[ WARN ] ${file} exists but is not valid JSON — skipped, left untouched`);
    return null;
  }
  data.mcpServers = data.mcpServers || {};
  for (const s of servers) {
    data.mcpServers[s.key] = { command: s.command, args: s.args, env: s.env };
  }
  writeJson(file, data);
  return file;
}

// ---- OpenCode: <target>/opencode.json ----
function generateOpencode(target, servers) {
  const file = path.join(target, "opencode.json");
  const { data, valid } = readJsonIfValid(file);
  if (!valid) {
    console.warn(`[ WARN ] ${file} exists but is not valid JSON — skipped, left untouched`);
    return null;
  }
  data.mcp = data.mcp || {};
  for (const s of servers) {
    data.mcp[s.key] = { type: "local", command: [s.command, ...s.args], environment: s.env, enabled: true };
  }
  writeJson(file, data);
  return file;
}

// ---- VS Code: <target>/.vscode/mcp.json ----
function generateVSCode(target, servers) {
  const file = path.join(target, ".vscode", "mcp.json");
  const { data, valid } = readJsonIfValid(file);
  if (!valid) {
    console.warn(`[ WARN ] ${file} exists but is not valid JSON — skipped, left untouched`);
    return null;
  }
  data.servers = data.servers || {};
  for (const s of servers) {
    data.servers[s.key] = { type: "stdio", command: s.command, args: s.args, env: s.env };
  }
  writeJson(file, data);
  return file;
}

// ---- Zed: <target>/.zed/settings.json (merged; skipped if JSONC/comments break strict parse) ----
function generateZed(target, servers) {
  const file = path.join(target, ".zed", "settings.json");
  const { data, valid, existed } = readJsonIfValid(file);
  if (!valid) {
    const sidecar = path.join(target, ".zed", "context_servers.mcp-snippet.json");
    const snippet = {};
    for (const s of servers) snippet[s.key] = { source: "custom", command: s.command, args: s.args, env: s.env };
    writeJson(sidecar, { context_servers: snippet });
    console.warn(`[ WARN ] ${file} exists but isn't strict JSON (likely has comments) — wrote ${sidecar} instead. Merge its "context_servers" block into settings.json by hand.`);
    return sidecar;
  }
  data.context_servers = data.context_servers || {};
  for (const s of servers) {
    data.context_servers[s.key] = { source: "custom", command: s.command, args: s.args, env: s.env };
  }
  writeJson(file, data);
  return existed ? file + " (merged)" : file;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(fs.readFileSync(args.manifest, "utf8"));
  const envMap = parseEnvFile(args.env);
  const servers = buildServerList(manifest, envMap);
  const requested = args.clients.split(",").map((s) => s.trim()).filter(Boolean);

  const generators = { claude: generateClaude, opencode: generateOpencode, vscode: generateVSCode, zed: generateZed };
  const written = [];
  for (const client of requested) {
    const fn = generators[client];
    if (!fn) {
      console.warn(`[ WARN ] unknown client "${client}" — skipped`);
      continue;
    }
    const result = fn(args.target, servers);
    if (result) written.push(`${client}: ${result}`);
  }

  console.log(`\n[ OK ] MCP config written for ${servers.length} servers across ${written.length} client(s):`);
  written.forEach((w) => console.log(`  - ${w}`));
  console.log(`\n[ WARN ] These files contain real credential values copied from .env. Do not commit them.`);
}

main();
