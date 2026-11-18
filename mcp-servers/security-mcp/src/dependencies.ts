import { execa, ExecaError } from "execa";
import path from "node:path";
import fs from "node:fs";
import { config } from "./config.js";
import type {
  Vulnerability,
  ProjectType,
  ScannerResult,
  Severity,
} from "./types.js";

function parseSeverity(raw: string): Severity {
  const s = raw.toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("medium") || s.includes("moderate")) return "medium";
  if (s.includes("low")) return "low";
  return "info";
}

async function runNpmAudit(cwd: string): Promise<ScannerResult> {
  try {
    const { stdout } = await execa("npm", ["audit", "--json"], {
      cwd,
      reject: false,
      timeout: 60_000,
    });
    const data = JSON.parse(stdout);
    const findings: Vulnerability[] = [];
    if (data.vulnerabilities) {
      for (const [pkg, info] of Object.entries(data.vulnerabilities) as [
        string,
        any
      ][]) {
        const via = info.via?.[0];
        const cve =
          typeof via === "object" && via?.cve
            ? via.cve
            : `NPM-${pkg}-${info.severity}`;
        findings.push({
          id: cve,
          severity: parseSeverity(info.severity),
          title: `${pkg}: ${info.title || info.severity}`,
          description: info.title || `Vulnerability in ${pkg}`,
          package: pkg,
          version: info.range,
          fix: info.fixAvailable
            ? typeof info.fixAvailable === "object"
              ? `${info.fixAvailable.version}`
              : "Upgrade to latest"
            : undefined,
          references: info.url ? [info.url] : undefined,
          path: path.relative(config.projectRoot, cwd),
        });
      }
    }
    return { success: true, findings };
  } catch (err) {
    return {
      success: false,
      findings: [],
      error: `npm audit failed: ${(err as Error).message}`,
    };
  }
}

async function runNpmAuditProduction(cwd: string): Promise<ScannerResult> {
  try {
    const { stdout } = await execa("npm", ["audit", "--json", "--only=prod"], {
      cwd,
      reject: false,
      timeout: 60_000,
    });
    const data = JSON.parse(stdout);
    const findings: Vulnerability[] = [];
    if (data.vulnerabilities) {
      for (const [pkg, info] of Object.entries(data.vulnerabilities) as [
        string,
        any
      ][]) {
        const via = info.via?.[0];
        const cve =
          typeof via === "object" && via?.cve
            ? via.cve
            : `NPM-${pkg}-${info.severity}`;
        findings.push({
          id: cve,
          severity: parseSeverity(info.severity),
          title: `${pkg}: ${info.title || info.severity}`,
          description: info.title || `Vulnerability in ${pkg}`,
          package: pkg,
          version: info.range,
          fix: info.fixAvailable
            ? typeof info.fixAvailable === "object"
              ? `${info.fixAvailable.version}`
              : "Upgrade to latest"
            : undefined,
          references: info.url ? [info.url] : undefined,
          path: path.relative(config.projectRoot, cwd),
        });
      }
    }
    return { success: true, findings };
  } catch (err) {
    return {
      success: false,
      findings: [],
      error: `npm audit (production) failed: ${(err as Error).message}`,
    };
  }
}

async function runPnpmAudit(cwd: string): Promise<ScannerResult> {
  try {
    const { stdout } = await execa("pnpm", ["audit", "--json"], {
      cwd,
      reject: false,
      timeout: 60_000,
    });
    const data = JSON.parse(stdout);
    const findings: Vulnerability[] = [];
    if (data.vulnerabilities) {
      for (const [pkg, info] of Object.entries(data.vulnerabilities) as [
        string,
        any
      ][]) {
        findings.push({
          id: info.cve || `PNPM-${pkg}`,
          severity: parseSeverity(info.severity),
          title: `${pkg}: ${info.severity}`,
          description: info.via?.[0]?.title || `Vulnerability in ${pkg}`,
          package: pkg,
          version: info.range,
          fix: info.fixAvailable === false ? undefined : "Upgrade to latest",
          path: path.relative(config.projectRoot, cwd),
        });
      }
    }
    return { success: true, findings };
  } catch (err) {
    return {
      success: false,
      findings: [],
      error: `pnpm audit failed: ${(err as Error).message}`,
    };
  }
}

async function runPipAudit(cwd: string): Promise<ScannerResult> {
  try {
    const { stdout } = await execa(config.pipAuditPath, [
      "--requirement",
      "requirements.txt",
      "--format",
      "json",
    ], {
      cwd,
      reject: false,
      timeout: 120_000,
    });
    const data = JSON.parse(stdout);
    const findings: Vulnerability[] = [];
    if (Array.isArray(data)) {
      for (const dep of data) {
        for (const vuln of dep.vulnerabilities || []) {
          findings.push({
            id: vuln.id || `PIP-${dep.name}`,
            severity: parseSeverity(vuln.severity || "medium"),
            title: `${dep.name}: ${vuln.id || "unknown"}`,
            description: vuln.description || `Vulnerability in ${dep.name}`,
            package: dep.name,
            version: dep.version,
            fix: vuln.fix_versions?.join(", "),
            references: vuln.urls || undefined,
            path: path.relative(config.projectRoot, cwd),
          });
        }
      }
    }
    return { success: true, findings };
  } catch (err) {
    return {
      success: false,
      findings: [],
      error: `pip-audit failed: ${(err as Error).message}`,
    };
  }
}

async function runTrivyFilesystem(cwd: string): Promise<ScannerResult> {
  try {
    const { stdout } = await execa(config.trivyPath, [
      "fs",
      "--format",
      "json",
      "--severity",
      "CRITICAL,HIGH,MEDIUM,LOW",
      cwd,
    ], {
      reject: false,
      timeout: 180_000,
    });
    const data = JSON.parse(stdout);
    const findings: Vulnerability[] = [];
    const results = data.Results || [];
    for (const result of results) {
      const target = result.Target || "unknown";
      for (const vuln of result.Vulnerabilities || []) {
        findings.push({
          id: vuln.VulnerabilityID || `TRIVY-${target}`,
          severity: parseSeverity(vuln.Severity || "unknown"),
          title: `${vuln.PkgName}: ${vuln.VulnerabilityID || "unknown"}`,
          description: vuln.Title || vuln.Description || "No description",
          package: vuln.PkgName,
          version: vuln.InstalledVersion,
          fix: vuln.FixedVersion,
          references: vuln.References || undefined,
          path: target,
        });
      }
    }
    return { success: true, findings };
  } catch (err) {
    return {
      success: false,
      findings: [],
      error: `trivy fs scan failed: ${(err as Error).message}`,
    };
  }
}

export async function detectProjectType(cwd: string): Promise<ProjectType> {
  const hasPackageLock =
    fs.existsSync(path.join(cwd, "package-lock.json")) ||
    fs.existsSync(path.join(cwd, "yarn.lock")) ||
    fs.existsSync(path.join(cwd, "pnpm-lock.yaml"));
  const hasPackageJson = fs.existsSync(path.join(cwd, "package.json"));
  const hasRequirements = fs.existsSync(path.join(cwd, "requirements.txt"));
  const hasPipfile = fs.existsSync(path.join(cwd, "Pipfile"));
  const hasPyproject = fs.existsSync(path.join(cwd, "pyproject.toml"));
  const hasDockerfile = fs.existsSync(path.join(cwd, "Dockerfile"));

  if (hasPackageLock || hasPackageJson) return "node";
  if (hasRequirements || hasPipfile || hasPyproject) return "python";
  if (hasDockerfile) return "docker";
  return "node";
}

async function runPnpmOrNpmAudit(cwd: string): Promise<ScannerResult> {
  const hasPnpmLock = fs.existsSync(path.join(cwd, "pnpm-lock.yaml"));
  const hasNpmLock = fs.existsSync(path.join(cwd, "package-lock.json"));

  if (hasPnpmLock) {
    const result = await runPnpmAudit(cwd);
    if (result.success && result.findings.length > 0) return result;
  }

  if (hasNpmLock) {
    return await runNpmAudit(cwd);
  }

  return { success: true, findings: [] };
}

export async function scanDependencies(
  projectType: ProjectType,
  cwd: string
): Promise<{
  vulnerabilities: Vulnerability[];
  errors: string[];
}> {
  const errors: string[] = [];
  const allVulns: Vulnerability[] = [];

  if (projectType === "node" || projectType === "auto") {
    const npmResult = await runPnpmOrNpmAudit(cwd);
    if (!npmResult.success && npmResult.error) {
      errors.push(npmResult.error);
    } else {
      allVulns.push(...(npmResult.findings as Vulnerability[]));
    }

    const trivyResult = await runTrivyFilesystem(cwd);
    if (trivyResult.success) {
      allVulns.push(...(trivyResult.findings as Vulnerability[]));
    }
  }

  if (projectType === "python" || projectType === "auto") {
    const pipResult = await runPipAudit(cwd);
    if (!pipResult.success && pipResult.error) {
      errors.push(pipResult.error);
    } else {
      allVulns.push(...(pipResult.findings as Vulnerability[]));
    }
  }

  if (projectType === "docker" || projectType === "auto") {
    const trivyResult = await runTrivyFilesystem(cwd);
    if (trivyResult.success) {
      allVulns.push(...(trivyResult.findings as Vulnerability[]));
    } else if (trivyResult.error) {
      errors.push(trivyResult.error);
    }
  }

  const deduped = deduplicateVulnerabilities(allVulns);
  return { vulnerabilities: deduped, errors };
}

function deduplicateVulnerabilities(
  vulns: Vulnerability[]
): Vulnerability[] {
  const seen = new Set<string>();
  return vulns.filter((v) => {
    const key = `${v.id}|${v.package}|${v.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
