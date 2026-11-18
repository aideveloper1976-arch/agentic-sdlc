import { config } from "./config.js";
import { scanDependencies, detectProjectType } from "./dependencies.js";
import { scanSecrets } from "./secrets.js";
import { scanCodeSecurity, analyzeAuthFlows, checkApiSecurity } from "./api.js";
import { generateSecurityReport, saveSecurityReport, saveSecurityEvidence } from "./report.js";
import type {
  Vulnerability,
  SecretFinding,
  CodeIssue,
  AuthFinding,
  ApiFinding,
  SecurityReport,
  ProjectType,
} from "./types.js";

export interface FullScanOptions {
  projectType?: ProjectType;
  codePath?: string;
  apiBaseUrl?: string;
  featureId?: string;
  saveEvidence?: boolean;
}

export interface FullScanResult {
  success: boolean;
  report?: SecurityReport;
  vulnerabilities: Vulnerability[];
  secrets: SecretFinding[];
  codeIssues: CodeIssue[];
  authIssues: AuthFinding[];
  apiIssues: ApiFinding[];
  errors: string[];
  reportPath?: string;
}

export async function runFullSecurityScan(
  options: FullScanOptions = {}
): Promise<FullScanResult> {
  const errors: string[] = [];
  const scanPath = options.codePath || config.projectRoot;
  const projectType = options.projectType || "auto";

  const resolvedType =
    projectType === "auto" ? await detectProjectType(scanPath) : projectType;

  const [depResult, secretResult, codeResult, authResult, apiResult] =
    await Promise.all([
      scanDependencies(resolvedType, scanPath),
      scanSecrets(scanPath),
      scanCodeSecurity(scanPath),
      analyzeAuthFlows(scanPath),
      checkApiSecurity(options.apiBaseUrl),
    ]);

  errors.push(...depResult.errors, ...secretResult.errors, ...codeResult.errors, ...authResult.errors, ...apiResult.errors);

  const result: FullScanResult = {
    success: errors.length === 0,
    vulnerabilities: depResult.vulnerabilities,
    secrets: secretResult.findings,
    codeIssues: codeResult.issues,
    authIssues: authResult.authIssues,
    apiIssues: apiResult.apiIssues,
    errors,
  };

  if (options.featureId) {
    const report = generateSecurityReport({
      featureId: options.featureId,
      vulnerabilities: result.vulnerabilities,
      secrets: result.secrets,
      codeIssues: result.codeIssues,
      authIssues: result.authIssues,
      apiIssues: result.apiIssues,
    });

    const reportPath = await saveSecurityReport(report);
    result.report = report;
    result.reportPath = reportPath;

    if (options.saveEvidence) {
      await saveSecurityEvidence({
        entityId: options.featureId,
        findings: [
          ...result.vulnerabilities,
          ...result.secrets,
          ...result.codeIssues,
          ...result.authIssues,
          ...result.apiIssues,
        ],
        severitySummary: {
          critical: report.summary.criticalCount,
          high: report.summary.highCount,
          medium: report.summary.mediumCount,
          low: report.summary.lowCount,
          info: 0,
        },
        reportPath,
      });
    }
  }

  return result;
}

export async function runDependencyScanOnly(
  projectType?: ProjectType
): Promise<{
  vulnerabilities: Vulnerability[];
  errors: string[];
  projectType: ProjectType;
}> {
  const scanPath = config.projectRoot;
  const resolvedType = projectType || (await detectProjectType(scanPath));
  const result = await scanDependencies(resolvedType, scanPath);
  return {
    vulnerabilities: result.vulnerabilities,
    errors: result.errors,
    projectType: resolvedType,
  };
}

export async function runSecretsScanOnly(
  path?: string
): Promise<{
  findings: SecretFinding[];
  errors: string[];
}> {
  return await scanSecrets(path || config.projectRoot);
}

export async function runCodeSecurityScanOnly(
  path?: string
): Promise<{
  issues: CodeIssue[];
  errors: string[];
}> {
  return await scanCodeSecurity(path || config.projectRoot);
}

export async function runAuthAnalysisOnly(
  path?: string
): Promise<{
  authIssues: AuthFinding[];
  errors: string[];
}> {
  return await analyzeAuthFlows(path || config.projectRoot);
}

export async function runApiCheckOnly(
  baseUrl?: string
): Promise<{
  apiIssues: ApiFinding[];
  errors: string[];
}> {
  return await checkApiSecurity(baseUrl);
}
