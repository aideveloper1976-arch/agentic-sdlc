#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { config } from "./config.js";
import { executeCommand } from "./executor.js";
import { validateCwd } from "./sandbox.js";
import { readLocalLogs } from "./logs.js";
import {
  dockerComposeUp, dockerComposeDown, dockerComposeBuild,
  dockerPs, dockerLogs, dockerComposeLogs,
  dockerContextUse, dockerContextShow, dockerContextLs,
} from "./docker.js";
import { registerService, listServices, clearServices } from "./services.js";
import type { ProjectInfo, ServiceInfo } from "./types.js";

const server = new Server(
  { name: "code-execution-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const RunCommandSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  timeoutMs: z.number().min(1000).max(300000).optional(),
});

const RunTestsSchema = z.object({
  framework: z.enum(["auto", "jest", "vitest", "pytest", "go"]).default("auto"),
});

const InstallDependenciesSchema = z.object({
  manager: z.enum(["auto", "npm", "pnpm", "yarn"]).default("auto"),
});

const DockerComposeUpSchema = z.object({
  detach: z.boolean().default(true),
  services: z.array(z.string()).optional(),
});

const DockerComposeBuildSchema = z.object({
  services: z.array(z.string()).optional(),
});

const DockerLogsSchema = z.object({
  containerName: z.string().min(1),
  tail: z.number().min(1).max(10000).default(200),
});

const DockerComposeLogsSchema = z.object({
  service: z.string().optional(),
  tail: z.number().min(1).max(10000).optional(),
});

const SetDockerContextSchema = z.object({
  contextName: z.string().min(1),
});

const ReadLogsSchema = z.object({
  filePath: z.string().min(1),
  tail: z.number().optional(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "run_command",
      description: "Run a development command. Validated against security allowlist. Blocked: rm -rf, sudo, curl, wget pipes, interactive shells, docker run.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string" },
          args: { type: "array", items: { type: "string" } },
          cwd: { type: "string" },
          timeoutMs: { type: "number" },
        },
        required: ["command"],
      },
    },
    {
      name: "run_tests",
      description: "Auto-detect and run test suite for the project.",
      inputSchema: {
        type: "object",
        properties: {
          framework: { type: "string", enum: ["auto", "jest", "vitest", "pytest", "go"], default: "auto" },
        },
      },
    },
    {
      name: "install_dependencies",
      description: "Install project dependencies using the detected or specified package manager.",
      inputSchema: {
        type: "object",
        properties: {
          manager: { type: "string", enum: ["auto", "npm", "pnpm", "yarn"], default: "auto" },
        },
      },
    },
    {
      name: "get_project_info",
      description: "Detect project language, framework, package manager, scripts, and Docker configuration.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "read_logs",
      description: "Read local log files with optional tail.",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          tail: { type: "number" },
        },
        required: ["filePath"],
      },
    },
    {
      name: "docker_compose_up",
      description: "Start docker compose services.",
      inputSchema: {
        type: "object",
        properties: {
          detach: { type: "boolean", default: true },
          services: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "docker_compose_down",
      description: "Stop all docker compose services.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "docker_compose_build",
      description: "Build docker compose containers.",
      inputSchema: {
        type: "object",
        properties: {
          services: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "docker_ps",
      description: "List running docker containers.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "docker_logs",
      description: "View logs from a docker container.",
      inputSchema: {
        type: "object",
        properties: {
          containerName: { type: "string" },
          tail: { type: "number", default: 200 },
        },
        required: ["containerName"],
      },
    },
    {
      name: "docker_compose_logs",
      description: "View logs from docker compose services.",
      inputSchema: {
        type: "object",
        properties: {
          service: { type: "string" },
          tail: { type: "number" },
        },
      },
    },
    {
      name: "set_docker_context",
      description: "Set the active docker context.",
      inputSchema: {
        type: "object",
        properties: {
          contextName: { type: "string" },
        },
        required: ["contextName"],
      },
    },
    {
      name: "get_docker_context",
      description: "Get the current docker context.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

function detectPackageManager(cwd: string): "npm" | "pnpm" | "yarn" | null {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  if (fs.existsSync(path.join(cwd, "package.json"))) return "npm";
  return null;
}

async function detectProjectInfo(cwd: string): Promise<ProjectInfo> {
  const info: ProjectInfo = {
    language: null,
    framework: null,
    packageManager: null,
    hasDockerCompose: false,
    hasDockerfile: false,
    scripts: [],
    dependencies: 0,
    devDependencies: 0,
  };

  info.hasDockerCompose = fs.existsSync(path.join(cwd, "docker-compose.yml")) ||
    fs.existsSync(path.join(cwd, "docker-compose.yaml"));
  info.hasDockerfile = fs.existsSync(path.join(cwd, "Dockerfile"));

  const pm = detectPackageManager(cwd);
  info.packageManager = pm;

  if (pm) {
    const pkgJson = path.join(cwd, "package.json");
    if (fs.existsSync(pkgJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf-8"));
        info.scripts = Object.keys(pkg.scripts || {});
        info.dependencies = Object.keys(pkg.dependencies || {}).length;
        info.devDependencies = Object.keys(pkg.devDependencies || {}).length;
        info.language = "javascript";

        if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) info.language = "typescript";

        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        if (allDeps.next) info.framework = "next";
        else if (allDeps.react) info.framework = "react";
        else if (allDeps.vue) info.framework = "vue";
        else if (allDeps.express) info.framework = "express";
      } catch { /* ignore */ }
    }
  }

  if (fs.existsSync(path.join(cwd, "go.mod"))) {
    info.language = "go";
    info.packageManager = "go";
  }

  if (fs.existsSync(path.join(cwd, "requirements.txt")) ||
      fs.existsSync(path.join(cwd, "pyproject.toml")) ||
      fs.existsSync(path.join(cwd, "setup.py"))) {
    info.language = "python";
    info.packageManager = "pip";
  }

  return info;
}

async function detectTestFramework(cwd: string): Promise<string> {
  const pkgJson = path.join(cwd, "package.json");
  if (fs.existsSync(pkgJson)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf-8"));
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (allDeps.vitest) return "vitest";
      if (allDeps.jest) return "jest";
    } catch { /* ignore */ }
  }

  if (fs.existsSync(path.join(cwd, "vitest.config.ts")) ||
      fs.existsSync(path.join(cwd, "vitest.config.js"))) return "vitest";
  if (fs.existsSync(path.join(cwd, "jest.config.ts")) ||
      fs.existsSync(path.join(cwd, "jest.config.js"))) return "jest";
  if (fs.existsSync(path.join(cwd, "go.mod"))) return "go";
  if (fs.existsSync(path.join(cwd, "pytest.ini")) ||
      fs.existsSync(path.join(cwd, "pyproject.toml"))) return "pytest";

  const pkgJson2 = path.join(cwd, "package.json");
  if (fs.existsSync(pkgJson2)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJson2, "utf-8"));
      const scripts = Object.values(pkg.scripts || {}) as string[];
      if (scripts.some((s: string) => s.includes("vitest"))) return "vitest";
      if (scripts.some((s: string) => s.includes("jest"))) return "jest";
    } catch { /* ignore */ }
  }

  return "npm test";
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "run_command": {
        const parsed = RunCommandSchema.parse(args);
        const result = await executeCommand({
          command: parsed.command,
          args: parsed.args,
          cwd: parsed.cwd,
          timeoutMs: parsed.timeoutMs,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "run_tests": {
        const parsed = RunTestsSchema.parse(args);
        const cwd = config.allowedDir;
        const detectedFramework = parsed.framework === "auto"
          ? await detectTestFramework(cwd)
          : parsed.framework;

        let result;
        switch (detectedFramework) {
          case "vitest":
            result = await executeCommand({ command: "npm", args: ["exec", "--", "vitest", "run", "--reporter=verbose"], cwd });
            break;
          case "jest":
            result = await executeCommand({ command: "npm", args: ["exec", "--", "jest", "--verbose"], cwd });
            break;
          case "pytest":
            result = await executeCommand({ command: "pytest", args: ["-v"], cwd });
            break;
          case "go":
            result = await executeCommand({ command: "go", args: ["test", "./..."], cwd });
            break;
          default:
            result = await executeCommand({ command: "npm", args: ["test"], cwd });
            break;
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              framework: detectedFramework,
              command: `${detectedFramework} test`,
              exitCode: result.exitCode,
              durationMs: result.durationMs,
              stdout: result.stdout,
              stderr: result.stderr,
            }, null, 2),
          }],
        };
      }

      case "install_dependencies": {
        const parsed = InstallDependenciesSchema.parse(args);
        const cwd = config.allowedDir;
        const pm = parsed.manager === "auto" ? detectPackageManager(cwd) || "npm" : parsed.manager;

        let result;
        switch (pm) {
          case "pnpm":
            result = await executeCommand({ command: "pnpm", args: ["install"], cwd });
            break;
          case "yarn":
            result = await executeCommand({ command: "yarn", args: ["install"], cwd });
            break;
          default:
            result = await executeCommand({ command: "npm", args: ["install"], cwd });
            break;
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              manager: pm,
              exitCode: result.exitCode,
              durationMs: result.durationMs,
              stdout: result.stdout,
              stderr: result.stderr,
            }, null, 2),
          }],
        };
      }

      case "get_project_info": {
        const cwd = config.allowedDir;
        const info = await detectProjectInfo(cwd);
        return {
          content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
        };
      }

      case "read_logs": {
        const parsed = ReadLogsSchema.parse(args);
        const cwdCheck = validateCwd(path.dirname(path.resolve(parsed.filePath)));
        if (!cwdCheck.allowed) {
          return { content: [{ type: "text", text: JSON.stringify({ error: cwdCheck.reason }) }], isError: true };
        }
        const result = readLocalLogs(path.resolve(parsed.filePath), parsed.tail);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "docker_compose_up": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const parsed = DockerComposeUpSchema.parse(args);
        const result = await dockerComposeUp(parsed.detach, parsed.services);

        if (result.exitCode === 0) {
          const ps = await dockerPs();
          const containerNames = ps.stdout
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const parts = line.split("\t");
              return {
                id: parts[0],
                name: parts[1],
                status: parts[2],
                ports: parts[3],
              };
            });

          for (const c of containerNames) {
            registerService({
              type: "docker",
              name: c.name || "unknown",
              containerId: c.id,
              status: "running",
              ports: c.ports ? c.ports.split(", ") : undefined,
            });
          }

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                exitCode: result.exitCode,
                containers: containerNames,
                stdout: result.stdout,
                stderr: result.stderr,
              }, null, 2),
            }],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "docker_compose_down": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const result = await dockerComposeDown();
        clearServices();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "docker_compose_build": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const parsed = DockerComposeBuildSchema.parse(args);
        const result = await dockerComposeBuild(parsed.services);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "docker_ps": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const result = await dockerPs();

        const containers = result.stdout
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const parts = line.split("\t");
            return { id: parts[0], name: parts[1], status: parts[2], ports: parts[3] };
          });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ containers, count: containers.length }, null, 2),
          }],
        };
      }

      case "docker_logs": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const parsed = DockerLogsSchema.parse(args);
        const result = await dockerLogs(parsed.containerName, parsed.tail);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "docker_compose_logs": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const parsed = DockerComposeLogsSchema.parse(args);
        const result = await dockerComposeLogs(parsed.service, parsed.tail);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "set_docker_context": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const parsed = SetDockerContextSchema.parse(args);

        // Validate context exists by listing
        const lsResult = await dockerContextLs();
        const contexts = lsResult.stdout.split("\n").filter(Boolean);
        const exists = contexts.some((line: string) => {
          const name = line.split(/\s+/)[0];
          return name === parsed.contextName;
        });

        if (!exists) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Docker context '${parsed.contextName}' not found. Available contexts:`, contexts }) }],
            isError: true,
          };
        }

        const result = await dockerContextUse(parsed.contextName);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_docker_context": {
        if (!config.dockerEnabled) throw new Error("Docker is disabled");
        const result = await dockerContextShow();
        return {
          content: [{ type: "text", text: JSON.stringify({ currentContext: result.stdout.trim() }, null, 2) }],
        };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Code Execution MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
