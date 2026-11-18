# @opencode/security-mcp

Production-grade Security MCP server for [OpenCode](https://opencode.ai). Provides SAST, dependency scanning, secrets detection, API security analysis, and evidence generation for enterprise environments.

## Safety

- Read-only security analysis only
- Scans are limited to the project directory
- No external system scanning or active exploitation
- No penetration testing capabilities
- All operations are deterministic and safe

## Prerequisites

- Node.js >= 18
- Optional CLI tools for extended scanning:
  - [Trivy](https://github.com/aquasecurity/trivy) — filesystem and container scanning
  - [Gitleaks](https://github.com/gitleaks/gitleaks) — secrets detection
  - [pip-audit](https://github.com/pypa/pip-audit) — Python dependency scanning

## Installation

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env`:

```env
TRIVY_PATH=trivy
GITLEAKS_PATH=gitleaks
PIP_AUDIT_PATH=pip-audit
PROJECT_ROOT=
EVIDENCE_DIR=docs/product/evidence
TRACEABILITY_MCP_URL=http://localhost:3100
TRACEABILITY_MCP_TOKEN=
```

## Usage

### As an MCP server (stdio)

```bash
node dist/index.js
```

Configure in your MCP client:

```json
{
  "mcpServers": {
    "security": {
      "command": "node",
      "args": ["path/to/security-mcp/dist/index.js"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `run_dependency_scan` | Scan dependencies via npm/pnpm audit, pip-audit, trivy |
| `scan_secrets` | Detect hardcoded secrets with gitleaks + 25+ regex patterns |
| `scan_code_security` | SAST: eval, SQLi, XSS, path traversal, unsafe deserialization |
| `analyze_auth_flows` | Analyze auth logic, session handling, token practices |
| `check_api_security` | Check API endpoints for missing auth, CORS, info leaks |
| `run_container_scan` | Container/filesystem vulnerability scan via trivy |
| `generate_security_report` | Full security report in Markdown + JSON |
| `save_security_evidence` | Save evidence for traceability MCP integration |

## Output

Reports are saved to `docs/product/evidence/security/`:

```
docs/product/evidence/
  security/
    <featureId>.md         # Markdown report
    <featureId>.json       # JSON report
    evidence-<entityId>.json  # Evidence document
  vulnerabilities/
    <featureId>.json       # Vulnerability-specific JSON
```

## Architecture

```
src/
  index.ts         # MCP server entry point
  config.ts        # Configuration loading
  types.ts         # Shared type definitions
  scanners.ts      # Scan orchestrator
  dependencies.ts  # npm/pnpm/pip-audit/trivy integration
  secrets.ts       # Gitleaks + regex-based secret detection
  api.ts           # SAST + auth + API security analysis
  report.ts        # Report generation + evidence persistence
```

## Integrations

- **Traceability MCP**: Evidence documents include `traceabilityRef` for cross-referencing
- **CI/CD**: Run scans in pipelines using `npm run build && node dist/index.js`
- **Trivy**: Filesystem and container vulnerability scanning
- **Gitleaks**: Git-backed and non-git secret detection
