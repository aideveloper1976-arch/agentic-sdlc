import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type {
  Vulnerability,
  SecretFinding,
  CodeIssue,
  AuthFinding,
  ApiFinding,
} from "./types.js";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

const INSECURE_PATTERNS: Array<{
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  pattern: RegExp;
  description: string;
  recommendation: string;
}> = [
  {
    rule: "eval-usage",
    severity: "critical",
    pattern: /\beval\s*\(/g,
    description: "Use of eval() — arbitrary code execution risk",
    recommendation: "Remove eval() usage; use safer alternatives like Function constructor or JSON.parse",
  },
  {
    rule: "exec-usage",
    severity: "critical",
    pattern: /\b(child_process\.)?exec(File)?(Sync)?\s*\(/g,
    description: "Use of exec/execSync — command injection risk",
    recommendation: "Use execFile/spawn with non-shell mode and sanitized arguments",
  },
  {
    rule: "unsafe-deserialization",
    severity: "critical",
    pattern: /JSON\.parse\s*\(.*(?:userInput|req\.body|request\.body|ctx\.request|params)/g,
    description: "Unsafe deserialization of untrusted input",
    recommendation: "Validate schema with zod or ajv before parsing",
  },
  {
    rule: "function-constructor",
    severity: "high",
    pattern: /\bnew\s+Function\s*\(/g,
    description: "Function constructor — code injection risk",
    recommendation: "Avoid dynamic code generation; use predefined functions",
  },
  {
    rule: "settimeout-string",
    severity: "high",
    pattern: /\bsetTimeout\s*\(\s*["']/g,
    description: "setTimeout with string argument — eval-like behavior",
    recommendation: "Pass a function reference instead of a string",
  },
  {
    rule: "setinterval-string",
    severity: "high",
    pattern: /\bsetInterval\s*\(\s*["']/g,
    description: "setInterval with string argument — eval-like behavior",
    recommendation: "Pass a function reference instead of a string",
  },
  {
    rule: "sql-concatenation",
    severity: "critical",
    pattern: /(SELECT|INSERT|UPDATE|DELETE).*?['"`]\s*\+/gis,
    description: "SQL query string concatenation — SQL injection risk",
    recommendation: "Use parameterized queries or an ORM",
  },
  {
    rule: "no-input-validation",
    severity: "high",
    pattern: /\.params\b|\.query\b|\.body\b(?!.*(?:zod|joi|yup|ajv|validate|sanitize|assert))/g,
    description: "Direct use of request params/query/body without visible validation",
    recommendation: "Validate all input with a schema validation library",
  },
  {
    rule: "innerhtml-usage",
    severity: "high",
    pattern: /\.innerHTML\s*=/g,
    description: "Assignment to innerHTML — XSS risk",
    recommendation: "Use textContent or safe DOM APIs",
  },
  {
    rule: "dangerouslySetInnerHTML",
    severity: "high",
    pattern: /dangerouslySetInnerHTML/g,
    description: "React dangerouslySetInnerHTML — XSS risk",
    recommendation: "Use React fragments and sanitized rendering",
  },
  {
    rule: "crypto-createhash-with-md5",
    severity: "medium",
    pattern: /createHash\s*\(\s*["']md5["']/gi,
    description: "Use of MD5 hash — cryptographically broken",
    recommendation: "Use SHA-256 or stronger hashing algorithm",
  },
  {
    rule: "crypto-createhash-with-sha1",
    severity: "low",
    pattern: /createHash\s*\(\s*["']sha1["']/gi,
    description: "Use of SHA-1 hash — deprecated",
    recommendation: "Use SHA-256 or stronger hashing algorithm",
  },
  {
    rule: "no速率限制",
    severity: "medium",
    pattern: /\bapp\.(get|post|put|delete|patch)\s*\(/g,
    description: "Route handler without visible rate limiting",
    recommendation: "Implement rate limiting middleware (e.g., express-rate-limit)",
  },
  {
    rule: "cors-wildcard",
    severity: "medium",
    pattern: /(cors|CORS)\(.*\{[^}]*origin\s*:\s*["']\*["']/g,
    description: "CORS configured with wildcard origin",
    recommendation: "Restrict CORS to specific allowed origins",
  },
  {
    rule: "insecure-http",
    severity: "medium",
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g,
    description: "Plain HTTP connection (not HTTPS)",
    recommendation: "Use HTTPS for all external communications",
  },
  {
    rule: "hardcoded-secret-in-code",
    severity: "critical",
    pattern: /(secret|SECRET|secretKey|privateKey)\s*[:=]\s*["'][A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]{8,}["']/g,
    description: "Possible hardcoded secret value",
    recommendation: "Move secrets to environment variables or a secret manager",
  },
  {
    rule: "no-prototype-check",
    severity: "medium",
    pattern: /\bfor\s*\(.*\s+in\s+/g,
    description: "for-in loop without hasOwnProperty check — prototype pollution risk",
    recommendation: "Use hasOwnProperty or Object.keys/values/entries",
  },
  {
    rule: "buffer-noassert",
    severity: "high",
    pattern: /\.write\s*\([^)]*,\s*(?:["']utf["'])?\s*,\s*(?:\d+\s*,\s*)?["'](?:base64|hex)["']/g,
    description: "Buffer write with noAssert off — potential memory exposure",
    recommendation: "Use safe Buffer methods or TypedArrays",
  },
  {
    rule: "regex-dos",
    severity: "medium",
    pattern: /\(\.\*\+\)|\(\.\+\*\)|\(\.\*\{|\(\.\{/g,
    description: "Potentially vulnerable regex pattern — ReDoS risk",
    recommendation: "Use simpler patterns or regex libraries with timeout",
  },
  {
    rule: "require-unsafe",
    severity: "high",
    pattern: /require\s*\(\s*["'`].*[+'"`]/g,
    description: "Dynamic require — code injection risk",
    recommendation: "Use static imports or a controlled module registry",
  },
  {
    rule: "open-redirect",
    severity: "high",
    pattern: /res\.redirect\s*\(\s*(?:req|ctx|request)/g,
    description: "Open redirect via user-controlled input",
    recommendation: "Validate redirect targets against an allowlist",
  },
  {
    rule: "path-traversal",
    severity: "critical",
    pattern: /fs\.(readFile|writeFile|unlink|readdir|exists|access|stat|realpath|copyFile|rename|mkdtemp|appendFile|createReadStream|createWriteStream)\s*\([^)]*(?:req\.|ctx\.|params\.|query\.|body\.)/g,
    description: "File system operation with user-controlled input — path traversal risk",
    recommendation: "Validate and sanitize file paths; restrict to allowed directories",
  },
  {
    rule: "no-csp-headers",
    severity: "medium",
    pattern: /helmet|content-security-policy|csp/i,
    description: "Missing Content Security Policy headers — consider using helmet",
    recommendation: "Use helmet middleware to set security headers",
  },
];

export async function scanCodeSecurity(
  cwd: string
): Promise<{
  issues: CodeIssue[];
  errors: string[];
}> {
  const errors: string[] = [];
  const issues: CodeIssue[] = [];
  const scanDir = cwd || config.projectRoot;

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
    "coverage",
    ".nyc_output",
    "*.min.*",
    "*.bundle.*",
  ]);

  function collectFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.has(entry.name)) {
            files.push(...collectFiles(fullPath));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (
            [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java", ".go", ".rb", ".php"].includes(ext)
          ) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // skip
    }
    return files;
  }

  const sourceFiles = collectFiles(scanDir);

  for (const file of sourceFiles) {
    try {
      const stat = fs.statSync(file);
      if (stat.size > 1_048_576) continue;

      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (const rule of INSECURE_PATTERNS) {
        rule.pattern.lastIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const match = rule.pattern.exec(lines[i]);
          if (match) {
            issues.push({
              id: generateId("CODE"),
              severity: rule.severity,
              type: "insecure_pattern",
              rule: rule.rule,
              description: rule.description,
              file: path.relative(scanDir, file),
              line: i + 1,
              column: match.index,
              snippet: lines[i].trim().slice(0, 200),
              recommendation: rule.recommendation,
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return { issues, errors };
}

export async function analyzeAuthFlows(
  cwd: string
): Promise<{
  authIssues: AuthFinding[];
  errors: string[];
}> {
  const errors: string[] = [];
  const authIssues: AuthFinding[] = [];

  const EXCLUDE_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".venv",
    "__pycache__",
    "vendor",
    "target",
    "coverage",
  ]);

  function collectSourceFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.has(entry.name)) {
            files.push(...collectSourceFiles(fullPath));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java", ".go", ".rb"].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // skip
    }
    return files;
  }

  const files = collectSourceFiles(cwd || config.projectRoot);

  const AUTH_PATTERNS: Array<{
    type: AuthFinding["type"];
    severity: AuthFinding["severity"];
    flagPattern: RegExp;
    contextPattern?: RegExp;
    description: (match: string) => string;
  }> = [
    {
      type: "missing_auth",
      severity: "high",
      flagPattern: /\b(app|router|route)\.(get|post|put|delete|patch)\s*\(/g,
      contextPattern: /(authenticate|auth|protect|verifyToken|jwt|session|guard|middleware)/i,
      description: (m) =>
        `Route handler at '${m}' — verify authentication middleware is applied`,
    },
    {
      type: "weak_session",
      severity: "high",
      flagPattern: /(session\.secret|expressSession\(|cookieSession)/g,
      description: () => "Session configuration — verify secure, httpOnly, sameSite flags",
    },
    {
      type: "hardcoded_token",
      severity: "critical",
      flagPattern: /(jwt\.sign|jsonwebtoken\.sign)\s*\([^)]*["'][A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]{8,}["']/g,
      description: () => "Possible hardcoded JWT secret in code",
    },
    {
      type: "insecure_storage",
      severity: "high",
      flagPattern: /localStorage\.setItem\s*\(\s*["'](token|session|jwt|accessToken|refreshToken)/g,
      description: () => "Token stored in localStorage — vulnerable to XSS",
    },
    {
      type: "missing_validation",
      severity: "medium",
      flagPattern: /\bsignIn|signUp|login|register|authenticate\b/g,
      description: () => "Auth endpoint — verify input validation and rate limiting",
    },
    {
      type: "weak_algorithm",
      severity: "medium",
      flagPattern: /algorithm\s*:\s*["'](HS256|none)["']/g,
      description: () =>
        "JWT algorithm — HS256 is acceptable, 'none' is insecure",
    },
    {
      type: "improper_ror",
      severity: "medium",
      flagPattern: /catch\s*\([^)]*\)\s*\{[^}]*stack[^}]*\}/gs,
      description: () => "Error object may leak stack traces in production",
    },
  ];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (const pattern of AUTH_PATTERNS) {
        pattern.flagPattern.lastIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const match = pattern.flagPattern.exec(lines[i]);
          if (match) {
            if (
              pattern.type === "missing_auth" &&
              pattern.contextPattern
            ) {
              const contextStart = Math.max(0, i - 5);
              const contextEnd = Math.min(lines.length, i + 1);
              const contextBlock = lines
                .slice(contextStart, contextEnd)
                .join("\n");
              if (pattern.contextPattern.test(contextBlock)) {
                continue;
              }
            }

            authIssues.push({
              id: generateId("AUTH"),
              severity: pattern.severity,
              type: pattern.type,
              description: pattern.description(match[0]),
              file: path.relative(config.projectRoot, file),
              line: i + 1,
              snippet: lines[i].trim().slice(0, 200),
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return { authIssues, errors };
}

export async function checkApiSecurity(
  baseUrl?: string
): Promise<{
  apiIssues: ApiFinding[];
  errors: string[];
}> {
  const errors: string[] = [];
  const apiIssues: ApiFinding[] = [];

  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      const response = await fetch(url.toString(), {
        method: "OPTIONS",
        signal: AbortSignal.timeout(5_000),
      });

      const corsHeader = response.headers.get("access-control-allow-origin");
      if (corsHeader === "*") {
        apiIssues.push({
          id: generateId("API"),
          severity: "medium",
          type: "cors_misconfiguration",
          description:
            "CORS allows all origins (*) — restrict to specific origins",
          endpoint: url.toString(),
          method: "OPTIONS",
          statusCode: response.status,
          detail: `Access-Control-Allow-Origin: ${corsHeader}`,
        });
      }

      if (!response.headers.get("content-security-policy")) {
        apiIssues.push({
          id: generateId("API"),
          severity: "low",
          type: "information_disclosure",
          description:
            "Missing Content-Security-Policy header",
          endpoint: url.toString(),
          method: "OPTIONS",
          statusCode: response.status,
          detail: "Consider adding CSP headers",
        });
      }

      if (
        response.headers.get("x-powered-by") ||
        response.headers.get("server")
      ) {
        apiIssues.push({
          id: generateId("API"),
          severity: "low",
          type: "information_disclosure",
          description:
            "Server leaks technology information via headers",
          endpoint: url.toString(),
          method: "OPTIONS",
          statusCode: response.status,
          detail: `x-powered-by: ${response.headers.get("x-powered-by")}, server: ${response.headers.get("server")}`,
        });
      }
    } catch (err) {
      errors.push(
        `API endpoint unreachable at ${baseUrl}: ${(err as Error).message}`
      );
    }
  }

  const scanDir = config.projectRoot;

  const EXCLUDE_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".venv",
    "__pycache__",
    "vendor",
    "target",
    "coverage",
  ]);

  function collectSourceFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.has(entry.name)) {
            files.push(...collectSourceFiles(fullPath));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // skip
    }
    return files;
  }

  const files = collectSourceFiles(scanDir);

  const API_PATTERNS: Array<{
    type: ApiFinding["type"];
    severity: ApiFinding["severity"];
    pattern: RegExp;
    description: string;
  }> = [
    {
      type: "missing_auth",
      severity: "high",
      pattern: /\bapp\.(get|post|put|delete|patch)\s*\(/g,
      description: "Route handler — verify authentication middleware is applied to all API routes",
    },
    {
      type: "improper_error_handling",
      severity: "medium",
      pattern: /catch\s*\([^)]*\)\s*\{[^}]*\}/gs,
      description: "Generic catch block — may leak internal error details",
    },
    {
      type: "missing_validation",
      severity: "high",
      pattern: /req\.(body|params|query)\b(?!.*(?:zod|joi|yup|ajv|validate|sanitize|parse|assert))/g,
      description: "Request input used without visible validation",
    },
    {
      type: "rate_limiting",
      severity: "medium",
      pattern: /\bapp\.(get|post|put|delete|patch)\s*\(/g,
      description: "API route — consider adding rate limiting",
    },
    {
      type: "information_disclosure",
      severity: "low",
      pattern: /process\.env\.(NODE_ENV|APP_ENV)\b/g,
      description: "Environment check — ensure error details are hidden in production",
    },
  ];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (const apiPattern of API_PATTERNS) {
        apiPattern.pattern.lastIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const match = apiPattern.pattern.exec(lines[i]);
          if (match) {
            if (apiPattern.type === "rate_limiting") {
              const contextStart = Math.max(0, i - 3);
              const contextEnd = Math.min(lines.length, i + 3);
              const contextBlock = lines
                .slice(contextStart, contextEnd)
                .join("\n");
              if (
                /(rateLimit|rate-limit|RateLimit|limiter|throttle|ratelimit)/.test(
                  contextBlock
                )
              ) {
                continue;
              }
            }

            if (apiPattern.type === "missing_auth") {
              const contextStart = Math.max(0, i - 5);
              const contextEnd = Math.min(lines.length, i + 1);
              const contextBlock = lines
                .slice(contextStart, contextEnd)
                .join("\n");
              if (
                /(authenticate|auth|protect|verifyToken|jwt|guard|middleware|requireAuth)/i.test(
                  contextBlock
                )
              ) {
                continue;
              }
            }

            apiIssues.push({
              id: generateId("API"),
              severity: apiPattern.severity,
              type: apiPattern.type,
              description: apiPattern.description,
              detail: `Found in ${path.relative(config.projectRoot, file)}:${i + 1}`,
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return { apiIssues, errors };
}
