import { execa } from "execa";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { SecretFinding, ScannerResult } from "./types.js";

function generateId(): string {
  return `SEC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

const PATTERN_RULES: Array<{
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  pattern: RegExp;
  description: string;
}> = [
  {
    type: "aws-access-key",
    severity: "critical",
    pattern: /AKIA[0-9A-Z]{16}/g,
    description: "AWS Access Key ID",
  },
  {
    type: "aws-secret-key",
    severity: "critical",
    pattern: /aws[_-]?(secret|access)[_-]?key\s*[:=]\s*["']?[A-Za-z0-9\/+=]{40}["']?/gi,
    description: "AWS Secret Access Key",
  },
  {
    type: "github-token",
    severity: "critical",
    pattern: /ghp_[A-Za-z0-9]{36}/g,
    description: "GitHub Personal Access Token",
  },
  {
    type: "github-oauth-token",
    severity: "critical",
    pattern: /gho_[A-Za-z0-9]{36}/g,
    description: "GitHub OAuth Access Token",
  },
  {
    type: "github-app-token",
    severity: "critical",
    pattern: /ghu_[A-Za-z0-9]{36}/g,
    description: "GitHub App Token",
  },
  {
    type: "gitlab-token",
    severity: "high",
    pattern: /glpat-[A-Za-z0-9\-_]{20,}/g,
    description: "GitLab Personal Access Token",
  },
  {
    type: "slack-token",
    severity: "high",
    pattern: /xox[abpors]-[A-Za-z0-9]{10,}/g,
    description: "Slack Token",
  },
  {
    type: "private-key",
    severity: "critical",
    pattern: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PRIVATE)\s+KEY-----/g,
    description: "Private Key",
  },
  {
    type: "generic-api-key",
    severity: "high",
    pattern: /(api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}["']?/gi,
    description: "Generic API Key or Secret",
  },
  {
    type: "basic-auth-credentials",
    severity: "high",
    pattern: /https?:\/\/[^:]+:[^@]+@/g,
    description: "URL-embedded Basic Auth Credentials",
  },
  {
    type: "jwt-token",
    severity: "medium",
    pattern: /eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g,
    description: "JWT Token (possible hardcoded)",
  },
  {
    type: "password-field",
    severity: "high",
    pattern: /(password|passwd|pwd)\s*[:=]\s*["'][^"']{3,}["']/gi,
    description: "Hardcoded Password",
  },
  {
    type: "connection-string",
    severity: "high",
    pattern: /(mongodb|postgresql|mysql|redis|amqp):\/\/[^@\s]+:[^@\s]+@/g,
    description: "Database Connection String with Credentials",
  },
  {
    type: "google-oauth",
    severity: "high",
    pattern: /[0-9]{12}-[A-Za-z0-9_]{32}\.apps\.googleusercontent\.com/g,
    description: "Google OAuth Client ID",
  },
  {
    type: "google-service-account",
    severity: "critical",
    pattern: /"type"\s*:\s*"service_account"/g,
    description: "Google Service Account Key (JSON)",
  },
  {
    type: "slack-webhook",
    severity: "high",
    pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/]{44,}/g,
    description: "Slack Webhook URL",
  },
  {
    type: "stripe-live-key",
    severity: "critical",
    pattern: /sk_live_[A-Za-z0-9]{24,}/g,
    description: "Stripe Live Secret Key",
  },
  {
    type: "stripe-test-key",
    severity: "low",
    pattern: /sk_test_[A-Za-z0-9]{24,}/g,
    description: "Stripe Test Secret Key",
  },
  {
    type: "twilio-key",
    severity: "high",
    pattern: /SK[A-Za-z0-9]{32}/g,
    description: "Twilio API Key",
  },
  {
    type: "docker-config",
    severity: "high",
    pattern: /"auths"\s*:\s*\{/g,
    description: "Docker config with possible credentials",
  },
  {
    type: ".netrc-entry",
    severity: "high",
    pattern: /machine\s+\S+\s+login\s+\S+\s+password\s+\S+/g,
    description: ".netrc file with credentials",
  },
  {
    type: "ssh-key-comment",
    severity: "medium",
    pattern: /ssh-(rsa|dss|ed25519)\s+AAAA[A-Za-z0-9+/=]+/g,
    description: "SSH Public Key (should not be hardcoded)",
  },
  {
    type: "heroku-api-key",
    severity: "high",
    pattern: /[Hh][Ee][Rr][Oo][Kk][Uu].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/g,
    description: "Heroku API Key",
  },
  {
    type: "npm-token",
    severity: "high",
    pattern: /npm_[A-Za-z0-9]{36}/g,
    description: "npm Authentication Token",
  },
  {
    type: "artifactory-key",
    severity: "high",
    pattern: /(artifactory|jfrog)[_-]?api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9]{20,}["']?/gi,
    description: "Artifactory/JFrog API Key",
  },
  {
    type: "pypi-token",
    severity: "high",
    pattern: /pypi-[A-Za-z0-9]{20,}/g,
    description: "PyPI API Token",
  },
  {
    type: "gcp-service-account-path",
    severity: "high",
    pattern: /GOOGLE_APPLICATION_CREDENTIALS\s*[:=]\s*["']?[A-Za-z0-9_\/\.-]+\.json["']?/g,
    description: "GCP Service Account JSON Path",
  },
  {
    type: "azure-storage-key",
    severity: "high",
    pattern: /(azure|storage)[_-]?(account|access)[_-]?key\s*[:=]\s*["']?[A-Za-z0-9+/=]{44}["']?/gi,
    description: "Azure Storage Account Key",
  },
  {
    type: "azure-devops-pat",
    severity: "high",
    pattern: /[A-Za-z0-9]{52}/g,
    description: "Azure DevOps Personal Access Token (possible)",
  },
  {
    type: "authorization-header",
    severity: "high",
    pattern: /authorization:\s*(Bearer|Basic|Digest)\s+[A-Za-z0-9\-._~+/]+=*/gi,
    description: "Authorization Header in code",
  },
  {
    type: "sentry-dsn",
    severity: "medium",
    pattern: /https:\/\/[A-Za-z0-9]+@[A-Za-z0-9]+\.ingest\.sentry\.io\/\d+/g,
    description: "Sentry DSN with auth token",
  },
  {
    type: "s3-bucket-policy",
    severity: "medium",
    pattern: /arn:aws:s3:::[A-Za-z0-9\-_]+/g,
    description: "S3 Bucket ARN (may expose bucket names)",
  },
];

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "vendor",
  "target",
  ".venv",
  "__pycache__",
  ".gitlab",
  ".github",
  ".circleci",
  ".trivy",
  ".cache",
  "coverage",
  ".nyc_output",
  ".terraform",
  ".serverless",
  ".cdk",
  ".serverless_nextjs",
]);

const EXCLUDE_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".min.js",
  ".min.css",
  ".map",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pyc",
  ".o",
  ".class",
  ".jar",
  ".bin",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
]);

function isExcludedFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  for (const ex of EXCLUDE_FILES) {
    if (basename === ex || basename.endsWith(ex)) return true;
  }
  return false;
}

function shouldScanDirectory(dir: string): boolean {
  return !EXCLUDE_DIRS.has(path.basename(dir));
}

async function scanWithGitleaks(cwd: string): Promise<ScannerResult> {
  try {
    const { stdout } = await execa(config.gitleaksPath, [
      "detect",
      "--source",
      cwd,
      "--no-git",
      "--report-format",
      "json",
      "--report-path",
      "/dev/stdout",
      "--verbose",
    ], {
      reject: false,
      timeout: 120_000,
    });

    let findings: SecretFinding[] = [];
    if (stdout.trim()) {
      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          findings.push({
            id: generateId(),
            severity: entry.severity === "HIGH" ? "high" : entry.severity === "MEDIUM" ? "medium" : "low",
            type: entry.rule || entry.tags?.[0] || "unknown",
            description: entry.description || entry.match || "Secret detected by gitleaks",
            file: entry.file || entry.filename || "unknown",
            line: entry.startLine || entry.line || 0,
            match: entry.match?.slice(0, 80) || "(redacted)",
            context: entry.context || entry.lineContent || undefined,
          });
        } catch {
          continue;
        }
      }
    }
    return { success: true, findings };
  } catch (err) {
    return {
      success: false,
      findings: [],
      error: `gitleaks scan failed: ${(err as Error).message}`,
    };
  }
}

function walkDirectory(dir: string, fileList: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (shouldScanDirectory(fullPath)) {
          walkDirectory(fullPath, fileList);
        }
      } else if (entry.isFile() && !isExcludedFile(fullPath)) {
        fileList.push(fullPath);
      }
    }
  } catch {
    return fileList;
  }
  return fileList;
}

async function scanWithPatterns(cwd: string): Promise<ScannerResult> {
  const files = walkDirectory(cwd);
  const findings: SecretFinding[] = [];

  for (const file of files) {
    try {
      const stat = fs.statSync(file);
      if (stat.size > 1_048_576) continue;

      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (const rule of PATTERN_RULES) {
        rule.pattern.lastIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const match = rule.pattern.exec(lines[i]);
          if (match) {
            findings.push({
              id: generateId(),
              severity: rule.severity,
              type: rule.type,
              description: rule.description,
              file: path.relative(cwd, file),
              line: i + 1,
              match: match[0].slice(0, 80),
              context: lines[i].trim().slice(0, 200),
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return { success: true, findings };
}

export async function scanSecrets(
  cwd?: string
): Promise<{
  findings: SecretFinding[];
  errors: string[];
}> {
  const scanDir = cwd || config.projectRoot;
  const errors: string[] = [];

  const [gitleaksResult, patternResult] = await Promise.all([
    scanWithGitleaks(scanDir).catch((err) => ({
      success: false,
      findings: [],
      error: (err as Error).message,
    })),
    scanWithPatterns(scanDir),
  ]);

  if (!gitleaksResult.success && gitleaksResult.error) {
    errors.push(gitleaksResult.error);
  }

  const gitleaksFindings = gitleaksResult.success
    ? (gitleaksResult.findings as SecretFinding[])
    : [];

  const patternFindings = patternResult.findings as SecretFinding[];

  const merged = deduplicateSecrets(
    [...gitleaksFindings, ...patternFindings],
    scanDir
  );

  return { findings: merged, errors };
}

function deduplicateSecrets(
  findings: SecretFinding[],
  _scanDir: string
): SecretFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.file}:${f.line}:${f.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
