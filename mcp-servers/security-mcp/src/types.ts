export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ScanStatus = "completed" | "failed" | "skipped";

export type ProjectType = "node" | "python" | "docker" | "auto";

export interface Vulnerability {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  package?: string;
  version?: string;
  fix?: string;
  references?: string[];
  path?: string;
}

export interface SecretFinding {
  id: string;
  severity: Severity;
  type: string;
  description: string;
  file: string;
  line: number;
  commit?: string;
  match: string;
  context?: string;
}

export interface CodeIssue {
  id: string;
  severity: Severity;
  type: string;
  rule: string;
  description: string;
  file: string;
  line: number;
  column?: number;
  snippet?: string;
  recommendation?: string;
}

export interface AuthFinding {
  id: string;
  severity: Severity;
  type:
    | "missing_auth"
    | "weak_session"
    | "hardcoded_token"
    | "insecure_storage"
    | "missing_validation"
    | "improper_ror"
    | "weak_algorithm";
  description: string;
  file: string;
  line: number;
  snippet?: string;
}

export interface ApiFinding {
  id: string;
  severity: Severity;
  type:
    | "missing_auth"
    | "improper_error_handling"
    | "cors_misconfiguration"
    | "missing_validation"
    | "rate_limiting"
    | "information_disclosure";
  description: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  detail?: string;
}

export interface SecurityReport {
  featureId: string;
  generatedAt: string;
  summary: {
    totalVulnerabilities: number;
    totalSecrets: number;
    totalCodeIssues: number;
    totalAuthIssues: number;
    totalApiIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  vulnerabilities: Vulnerability[];
  secrets: SecretFinding[];
  codeIssues: CodeIssue[];
  authIssues: AuthFinding[];
  apiIssues: ApiFinding[];
  recommendations: string[];
  reportPath?: string;
}

export interface ScanResult {
  success: boolean;
  scanType: string;
  message?: string;
  vulnerabilities?: Vulnerability[];
  secrets?: SecretFinding[];
  codeIssues?: CodeIssue[];
  authIssues?: AuthFinding[];
  apiIssues?: ApiFinding[];
  error?: string;
}

export interface EvidenceDocument {
  entityId: string;
  type: "security_scan" | "vulnerability_report" | "secrets_audit";
  generatedAt: string;
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
}

export interface ScannerResult {
  success: boolean;
  findings: Vulnerability[] | SecretFinding[] | CodeIssue[];
  raw?: string;
  error?: string;
}
