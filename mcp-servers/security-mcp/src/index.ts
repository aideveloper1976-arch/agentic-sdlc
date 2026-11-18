#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { config } from "./config.js";
import { detectProjectType } from "./dependencies.js";
import {
  runDependencyScanOnly,
  runSecretsScanOnly,
  runCodeSecurityScanOnly,
  runAuthAnalysisOnly,
  runApiCheckOnly,
  runFullSecurityScan,
} from "./scanners.js";
import {
  generateSecurityReport,
  saveSecurityReport,
  saveSecurityEvidence,
} from "./report.js";
import type { ProjectType } from "./types.js";

const server = new Server(
  {
    name: "@opencode/security-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const ProjectTypeSchema = z.enum(["auto", "node", "python", "docker"]).optional().default("auto");

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_dependency_scan",
        description:
          "Scan project dependencies for known vulnerabilities using npm audit, pnpm audit, pip-audit, and trivy. Auto-detects project type.",
        inputSchema: {
          type: "object",
          properties: {
            projectType: {
              type: "string",
              enum: ["auto", "node", "python", "docker"],
              description: "Project type (auto-detect if not specified)",
              default: "auto",
            },
          },
        },
      },
      {
        name: "scan_secrets",
        description:
          "Scan codebase for hardcoded secrets, API keys, tokens, passwords, and private keys using gitleaks and 25+ regex patterns.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to scan (defaults to project root)",
            },
          },
        },
      },
      {
        name: "scan_code_security",
        description:
          "Static analysis of source code for insecure patterns: eval, SQL injection, XSS, path traversal, unsafe deserialization, and more.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to scan (defaults to project root)",
            },
          },
        },
      },
      {
        name: "analyze_auth_flows",
        description:
          "Analyze authentication logic: detect missing auth middleware, hardcoded tokens, insecure session handling, and weak algorithms.",
        inputSchema: {
          type: "object",
          properties: {
            codebasePath: {
              type: "string",
              description: "Path to codebase (defaults to project root)",
            },
          },
        },
      },
      {
        name: "check_api_security",
        description:
          "Check API security: missing auth, CORS misconfiguration, information disclosure, improper error handling, missing validation.",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Base URL of a running API service to test live endpoints",
            },
          },
        },
      },
      {
        name: "run_container_scan",
        description:
          "Scan container images or Dockerfiles for vulnerabilities using trivy filesystem scan.",
        inputSchema: {
          type: "object",
          properties: {
            imageName: {
              type: "string",
              description: "Container image name (uses filesystem scan if not specified)",
            },
          },
        },
      },
      {
        name: "generate_security_report",
        description:
          "Generate a comprehensive Markdown security report aggregating all scan findings for a feature/story.",
        inputSchema: {
          type: "object",
          properties: {
            featureId: {
              type: "string",
              description: "Feature ID or Story ID for the report",
            },
            projectType: {
              type: "string",
              enum: ["auto", "node", "python", "docker"],
              description: "Project type for dependency scan",
              default: "auto",
            },
            apiBaseUrl: {
              type: "string",
              description: "Optional API base URL to include API security checks",
            },
          },
          required: ["featureId"],
        },
      },
      {
        name: "save_security_evidence",
        description:
          "Save security scan evidence as JSON + Markdown for traceability MCP integration.",
        inputSchema: {
          type: "object",
          properties: {
            entityId: {
              type: "string",
              description: "Entity ID (feature, story, or scan identifier)",
            },
            projectType: {
              type: "string",
              enum: ["auto", "node", "python", "docker"],
              description: "Project type for dependency scan",
              default: "auto",
            },
            apiBaseUrl: {
              type: "string",
              description: "Optional API base URL for API security checks",
            },
            traceabilityRef: {
              type: "string",
              description: "Optional traceability MCP reference ID",
            },
          },
          required: ["entityId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "run_dependency_scan": {
        const projectType = args?.projectType as string | undefined;
        const params = ProjectTypeSchema.parse(projectType ?? "auto");
        const result = await runDependencyScanOnly(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "dependency",
                  projectType: result.projectType,
                  vulnerabilities: result.vulnerabilities,
                  errors: result.errors.length > 0 ? result.errors : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "scan_secrets": {
        const path = args?.path as string | undefined;
        const result = await runSecretsScanOnly(path);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "secrets",
                  findings: result.findings,
                  total: result.findings.length,
                  errors: result.errors.length > 0 ? result.errors : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "scan_code_security": {
        const path = args?.path as string | undefined;
        const result = await runCodeSecurityScanOnly(path);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "code_security",
                  issues: result.issues,
                  total: result.issues.length,
                  errors: result.errors.length > 0 ? result.errors : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "analyze_auth_flows": {
        const codebasePath = args?.codebasePath as string | undefined;
        const result = await runAuthAnalysisOnly(codebasePath);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "auth_analysis",
                  authIssues: result.authIssues,
                  total: result.authIssues.length,
                  errors: result.errors.length > 0 ? result.errors : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "check_api_security": {
        const baseUrl = args?.baseUrl as string | undefined;
        const result = await runApiCheckOnly(baseUrl);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "api_security",
                  apiIssues: result.apiIssues,
                  total: result.apiIssues.length,
                  errors: result.errors.length > 0 ? result.errors : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "run_container_scan": {
        const imageName = args?.imageName as string | undefined;
        const { scanDependencies } = await import("./dependencies.js");
        const result = await scanDependencies("docker", config.projectRoot);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "container",
                  imageName: imageName || "filesystem",
                  vulnerabilities: result.vulnerabilities,
                  errors: result.errors.length > 0 ? result.errors : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "generate_security_report": {
        const featureId = z.string().min(1).parse(args?.featureId);
        const projectType = ProjectTypeSchema.parse(args?.projectType);
        const apiBaseUrl = args?.apiBaseUrl as string | undefined;

        const result = await runFullSecurityScan({
          projectType,
          apiBaseUrl,
          featureId,
          saveEvidence: true,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "full_security_report",
                  featureId,
                  summary: result.report?.summary,
                  reportPath: result.reportPath,
                  recommendations: result.report?.recommendations,
                  errors: result.errors.length > 0 ? result.errors : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "save_security_evidence": {
        const entityId = z.string().min(1).parse(args?.entityId);
        const projectType = ProjectTypeSchema.parse(args?.projectType);
        const apiBaseUrl = args?.apiBaseUrl as string | undefined;
        const traceabilityRef = args?.traceabilityRef as string | undefined;

        const result = await runFullSecurityScan({
          projectType,
          apiBaseUrl,
          featureId: entityId,
        });

        if (!result.report) {
          throw new McpError(
            ErrorCode.InternalError,
            "Failed to generate security report"
          );
        }

        const evidencePath = await saveSecurityEvidence({
          entityId,
          findings: [
            ...result.vulnerabilities,
            ...result.secrets,
            ...result.codeIssues,
            ...result.authIssues,
            ...result.apiIssues,
          ],
          severitySummary: {
            critical: result.report.summary.criticalCount,
            high: result.report.summary.highCount,
            medium: result.report.summary.mediumCount,
            low: result.report.summary.lowCount,
            info: 0,
          },
          reportPath: result.reportPath || "",
          traceabilityRef,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  scanType: "save_evidence",
                  entityId,
                  evidencePath,
                  reportPath: result.reportPath,
                  severitySummary: result.report.summary,
                  traceabilityRef,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${err.errors.map((e) => e.message).join(", ")}`
      );
    }
    if (err instanceof McpError) throw err;
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${(err as Error).message}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Security MCP server running`);
  console.error(`  Project root: ${config.projectRoot}`);
  console.error(`  Evidence dir: ${config.evidenceDir}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
