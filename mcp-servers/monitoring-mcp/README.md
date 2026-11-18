# Monitoring MCP server

> Post-release checks: service and API health, Docker status, log search, metrics, threshold-based anomaly detection and alerts.

| | |
|---|---|
| Package | `@agentic-sdlc/monitoring-mcp` |
| Tools | 13 ([full list](../../docs/tool-catalog.md#monitoring-mcp)) |
| Transport | MCP over stdio |
| Key dependencies | `@modelcontextprotocol/sdk`, `execa`, `zod` |
| Configuration | [`.env.example`](.env.example) |
| Tests | covered by the [MCP smoke test](../../scripts/mcp-smoke.mjs) only; no unit tests yet |

**Run it from the repo root**

```bash
npm ci && npm run build
node mcp-servers/monitoring-mcp/dist/index.js
```

Part of [Agentic SDLC](../../README.md). The rest of this page is the server's detailed reference.

---

A monitoring MCP server for OpenCode that enables AI agents to monitor services, collect logs and metrics, detect anomalies, and manage alerts.

## Overview

This MCP server provides comprehensive monitoring capabilities for local services, Docker containers, and APIs. It implements 13 MCP tools covering the full observability lifecycle: health checks, log aggregation, metrics collection, anomaly detection, alerting, and reporting.

## Monitoring Capabilities

| Tool | Purpose |
|------|---------|
| `check_service_health` | Service health status (healthy/degraded/down) |
| `list_services` | List all running local and Docker services |
| `get_logs` | Retrieve service or container logs |
| `search_logs` | Search logs for errors, exceptions, keywords |
| `collect_metrics` | CPU, memory, and performance metrics snapshot |
| `detect_anomalies` | Error spikes, slow responses, high resource usage |
| `check_api_health` | HTTP health check with latency measurement |
| `monitor_docker` | Docker container status and resource usage |
| `generate_monitoring_report` | Comprehensive markdown monitoring report |
| `save_monitoring_evidence` | Save findings linked to traceability entities |
| `create_alert` | Create alerts with severity levels |
| `list_alerts` | Query alerts with filters |
| `resolve_alert` | Mark alerts as resolved |

## Setup

```bash
cd monitoring-mcp
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key configuration options:

- `ALLOWED_SERVICES` - Comma-separated list or `*` for all
- `DOCKER_ENABLED` - Enable/disable Docker integration
- `ANOMALY_*` - Thresholds for anomaly detection
- `HEALTH_TIMEOUT` - HTTP health check timeout (ms)

## Docker Integration

The server automatically discovers and monitors Docker containers when Docker is available:

```bash
# List Docker containers
list_services

# Get container logs
get_logs --containerName my-app

# Monitor specific container
monitor_docker --containerName my-app
```

## Usage

### Start the MCP server

```bash
node dist/index.js
```

### Example tool calls

```json
{
  "name": "check_service_health",
  "arguments": {
    "serviceName": "my-api"
  }
}
```

```json
{
  "name": "detect_anomalies",
  "arguments": {
    "serviceName": "my-api"
  }
}
```

```json
{
  "name": "generate_monitoring_report",
  "arguments": {
    "serviceName": "my-api"
  }
}
```

## OpenCode Integration

Add to your OpenCode configuration:

```json
{
  "mcp": {
    "monitoring": {
      "type": "local",
      "command": ["node", "./monitoring-mcp/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Agent Usage Rules

Agents should use these tools in the following workflows:

1. **After deployment**: `check_service_health` to verify services are up
2. **After test failures**: `get_logs` and `search_logs` to find root causes
3. **Before release**: `detect_anomalies` to catch issues early
4. **During incidents**: `create_alert` and `generate_monitoring_report` for documentation
5. **Continuous**: `collect_metrics` for performance baselines

## Output Structure

All tools return structured JSON:

```json
{
  "success": true,
  "service": "api",
  "status": "healthy",
  "metrics": {
    "cpu": 12,
    "memory": 45
  },
  "issues": []
}
```

## Reports

Generated reports are saved as markdown to `docs/product/evidence/monitoring/<id>.md` and include:

- Service Status
- Logs Summary
- Metrics Snapshot
- Detected Issues
- Anomalies
- Recommendations

Evidence files are saved as JSON to `docs/product/evidence/` and can be linked to traceability MCP entities.

## Limitations

- Read-only monitoring only (no restart, deploy, or config changes)
- Docker integration requires Docker CLI access
- Log access depends on system permissions
- Anomaly detection uses simple threshold-based heuristics (not ML)
- Metrics are system-level snapshots, not historical time series
- macOS `/proc/stat` not available; uses `ps` fallback for CPU metrics
