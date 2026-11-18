import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

dotenv.config();

export interface SecurityMcpConfig {
  trivyPath: string;
  gitleaksPath: string;
  pipAuditPath: string;
  projectRoot: string;
  evidenceDir: string;
  traceabilityUrl: string;
  traceabilityToken: string;
}

function resolveProjectRoot(): string {
  const env = process.env.PROJECT_ROOT;
  if (env) return path.resolve(env);
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (dir === "/") break;
    if (
      fs.existsSync(path.join(dir, "package.json")) ||
      fs.existsSync(path.join(dir, "pyproject.toml")) ||
      fs.existsSync(path.join(dir, "go.mod")) ||
      fs.existsSync(path.join(dir, "Cargo.toml"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function loadConfig(): SecurityMcpConfig {
  const projectRoot = resolveProjectRoot();
  return {
    trivyPath: process.env.TRIVY_PATH || "trivy",
    gitleaksPath: process.env.GITLEAKS_PATH || "gitleaks",
    pipAuditPath: process.env.PIP_AUDIT_PATH || "pip-audit",
    projectRoot,
    evidenceDir: process.env.EVIDENCE_DIR
      ? path.resolve(process.env.EVIDENCE_DIR)
      : path.resolve(projectRoot, "docs/product/evidence"),
    traceabilityUrl: process.env.TRACEABILITY_MCP_URL || "http://localhost:3100",
    traceabilityToken: process.env.TRACEABILITY_MCP_TOKEN || "",
  };
}

export const config: SecurityMcpConfig = loadConfig();
