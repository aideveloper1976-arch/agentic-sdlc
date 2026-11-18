import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type {
  SecurityReport,
  Vulnerability,
  SecretFinding,
  CodeIssue,
  AuthFinding,
  ApiFinding,
  EvidenceDocument,
  Severity,
} from "./types.js";

function getSeverityCount(
  items: Array<{ severity: Severity }>
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const item of items) {
    if (counts[item.severity] !== undefined) {
      counts[item.severity]++;
    }
  }
  return counts;
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export function generateSecurityReport(params: {
  featureId: string;
  vulnerabilities: Vulnerability[];
  secrets: SecretFinding[];
  codeIssues: CodeIssue[];
  authIssues: AuthFinding[];
  apiIssues: ApiFinding[];
}): SecurityReport {
  const vulnCounts = getSeverityCount(params.vulnerabilities);
  const secretCounts = getSeverityCount(params.secrets);
  const codeCounts = getSeverityCount(params.codeIssues);
  const authCounts = getSeverityCount(params.authIssues);
  const apiCounts = getSeverityCount(params.apiIssues);

  const allSeverities = [
    vulnCounts,
    secretCounts,
    codeCounts,
    authCounts,
    apiCounts,
  ];
  const totalCritical = allSeverities.reduce((s, c) => s + c.critical, 0);
  const totalHigh = allSeverities.reduce((s, c) => s + c.high, 0);
  const totalMedium = allSeverities.reduce((s, c) => s + c.medium, 0);
  const totalLow = allSeverities.reduce((s, c) => s + c.low, 0);

  const recommendations = generateRecommendations(
    params.vulnerabilities,
    params.secrets,
    params.codeIssues,
    params.authIssues,
    params.apiIssues
  );

  return {
    featureId: params.featureId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalVulnerabilities: params.vulnerabilities.length,
      totalSecrets: params.secrets.length,
      totalCodeIssues: params.codeIssues.length,
      totalAuthIssues: params.authIssues.length,
      totalApiIssues: params.apiIssues.length,
      criticalCount: totalCritical,
      highCount: totalHigh,
      mediumCount: totalMedium,
      lowCount: totalLow,
    },
    vulnerabilities: deduplicateById(params.vulnerabilities),
    secrets: deduplicateById(params.secrets),
    codeIssues: deduplicateById(params.codeIssues),
    authIssues: deduplicateById(params.authIssues),
    apiIssues: deduplicateById(params.apiIssues),
    recommendations,
  };
}

export async function saveSecurityReport(
  report: SecurityReport
): Promise<string> {
  const securityDir = path.join(config.evidenceDir, "security");
  const vulnerabilitiesDir = path.join(config.evidenceDir, "vulnerabilities");
  fs.mkdirSync(securityDir, { recursive: true });
  fs.mkdirSync(vulnerabilitiesDir, { recursive: true });

  const reportPath = path.join(securityDir, `${report.featureId}.md`);
  const jsonPath = path.join(securityDir, `${report.featureId}.json`);
  const vulnJsonPath = path.join(vulnerabilitiesDir, `${report.featureId}.json`);

  const markdown = renderReportMarkdown(report);
  fs.writeFileSync(reportPath, markdown, "utf-8");

  const jsonReport = {
    ...report,
    reportPath,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), "utf-8");

  const vulnJson = {
    featureId: report.featureId,
    generatedAt: report.generatedAt,
    summary: report.summary,
    vulnerabilities: report.vulnerabilities,
  };
  fs.writeFileSync(vulnJsonPath, JSON.stringify(vulnJson, null, 2), "utf-8");

  report.reportPath = reportPath;
  return reportPath;
}

export async function saveSecurityEvidence(params: {
  entityId: string;
  findings: readonly (Vulnerability | SecretFinding | CodeIssue | AuthFinding | ApiFinding)[];
  severitySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  reportPath: string;
  traceabilityRef?: string;
}): Promise<string> {
  const evidenceDir = path.join(config.evidenceDir, "security");
  fs.mkdirSync(evidenceDir, { recursive: true });

  const document: EvidenceDocument = {
    entityId: params.entityId,
    type: "security_scan",
    generatedAt: new Date().toISOString(),
    findings: params.findings,
    severitySummary: params.severitySummary,
    reportPath: params.reportPath,
    traceabilityRef: params.traceabilityRef,
  };

  const evidencePath = path.join(
    evidenceDir,
    `evidence-${params.entityId}.json`
  );
  fs.writeFileSync(evidencePath, JSON.stringify(document, null, 2), "utf-8");

  return evidencePath;
}

function generateRecommendations(
  vulnerabilities: Vulnerability[],
  secrets: SecretFinding[],
  codeIssues: CodeIssue[],
  authIssues: AuthFinding[],
  apiIssues: ApiFinding[]
): string[] {
  const recs: string[] = [];

  const criticalVulns = vulnerabilities.filter((v) => v.severity === "critical");
  if (criticalVulns.length > 0) {
    recs.push(
      `Address ${criticalVulns.length} critical vulnerabilities immediately — prioritize patching or upgrading affected packages.`
    );
  }

  const highVulns = vulnerabilities.filter((v) => v.severity === "high");
  if (highVulns.length > 0) {
    recs.push(
      `Resolve ${highVulns.length} high-severity vulnerabilities in the next sprint.`
    );
  }

  if (secrets.length > 0) {
    const criticalSecrets = secrets.filter((s) => s.severity === "critical");
    if (criticalSecrets.length > 0) {
      recs.push(
        `CRITICAL: ${criticalSecrets.length} hardcoded secrets detected. Rotate exposed credentials immediately.`
      );
    }
    recs.push(
      `Remove all ${secrets.length} detected secrets from source code. Use environment variables or a secret manager.`
    );
  }

  if (codeIssues.length > 0) {
    const evalIssues = codeIssues.filter(
      (i) => i.rule === "eval-usage" || i.rule === "exec-usage"
    );
    if (evalIssues.length > 0) {
      recs.push(
        `Remove ${evalIssues.length} instances of eval/exec — they pose arbitrary code execution risks.`
      );
    }
    const sqlIssues = codeIssues.filter(
      (i) => i.rule === "sql-concatenation"
    );
    if (sqlIssues.length > 0) {
      recs.push(
        `Fix ${sqlIssues.length} SQL injection risks — use parameterized queries.`
      );
    }
    recs.push(
      `Review and fix all ${codeIssues.length} insecure code patterns found.`
    );
  }

  if (authIssues.length > 0) {
    const missingAuth = authIssues.filter(
      (i) => i.type === "missing_auth"
    );
    if (missingAuth.length > 0) {
      recs.push(
        `Add authentication middleware to ${missingAuth.length} unprotected route(s).`
      );
    }
    const hardcodedTokens = authIssues.filter(
      (i) => i.type === "hardcoded_token"
    );
    if (hardcodedTokens.length > 0) {
      recs.push(
        `Remove ${hardcodedTokens.length} hardcoded JWT secrets — use environment variables.`
      );
    }
  }

  if (apiIssues.length > 0) {
    recs.push(
      `Apply fixes for ${apiIssues.length} API security issues identified.`
    );
  }

  if (recs.length === 0) {
    recs.push("No security issues detected. Continue following security best practices.");
  }

  return recs;
}

function renderReportMarkdown(report: SecurityReport): string {
  const s = report.summary;
  let md = `# Security Report

## Summary

- **Feature / Story:** \`${report.featureId}\`
- **Generated:** ${report.generatedAt}
- **Total Vulnerabilities:** ${s.totalVulnerabilities}
- **Total Secrets:** ${s.totalSecrets}
- **Total Code Issues:** ${s.totalCodeIssues}
- **Total Auth Issues:** ${s.totalAuthIssues}
- **Total API Issues:** ${s.totalApiIssues}

### Severity Breakdown

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${s.criticalCount} |
| 🟠 High | ${s.highCount} |
| 🟡 Medium | ${s.mediumCount} |
| 🟢 Low | ${s.lowCount} |

---

## Vulnerabilities

| ID | Severity | Package | Description | Fix |
|----|----------|---------|-------------|-----|
`;

  for (const v of report.vulnerabilities) {
    const sev = v.severity === "critical" ? "🔴" : v.severity === "high" ? "🟠" : v.severity === "medium" ? "🟡" : "🟢";
    md += `| ${v.id} | ${sev} ${v.severity} | ${v.package || "—"} | ${v.description} | ${v.fix || "—"} |\n`;
  }

  md += `\n---\n\n## Secrets Found\n\n| Type | Severity | File | Line | Description |\n|------|----------|------|------|-------------|\n`;

  for (const s of report.secrets) {
    const sev = s.severity === "critical" ? "🔴" : s.severity === "high" ? "🟠" : s.severity === "medium" ? "🟡" : "🟢";
    md += `| ${s.type} | ${sev} ${s.severity} | \`${s.file}\` | ${s.line} | ${s.description} |\n`;
  }

  md += `\n---\n\n## Code Risks\n\n| Rule | Severity | File | Line | Description |\n|------|----------|------|------|-------------|\n`;

  for (const c of report.codeIssues) {
    const sev = c.severity === "critical" ? "🔴" : c.severity === "high" ? "🟠" : c.severity === "medium" ? "🟡" : "🟢";
    md += `| ${c.rule} | ${sev} ${c.severity} | \`${c.file}\` | ${c.line} | ${c.description} |\n`;
  }

  md += `\n---\n\n## Auth Risks\n\n| Type | Severity | File | Line | Description |\n|------|----------|------|------|-------------|\n`;

  for (const a of report.authIssues) {
    const sev = a.severity === "critical" ? "🔴" : a.severity === "high" ? "🟠" : a.severity === "medium" ? "🟡" : "🟢";
    md += `| ${a.type} | ${sev} ${a.severity} | \`${a.file}\` | ${a.line} | ${a.description} |\n`;
  }

  md += `\n---\n\n## API Risks\n\n| Type | Severity | Description |\n|------|----------|-------------|\n`;

  for (const a of report.apiIssues) {
    const sev = a.severity === "critical" ? "🔴" : a.severity === "high" ? "🟠" : a.severity === "medium" ? "🟡" : "🟢";
    md += `| ${a.type} | ${sev} ${a.severity} | ${a.description} |\n`;
  }

  md += `\n---\n\n## Recommendations\n\n`;

  for (const r of report.recommendations) {
    md += `- ${r}\n`;
  }

  md += `\n---\n\n*Report generated by OpenCode Security MCP server*\n`;

  return md;
}
