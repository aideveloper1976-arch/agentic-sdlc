#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { config } from './config.js'
import { checkServiceHealth, checkApiHealth } from './health.js'
import { listServices, findService } from './services.js'
import { getLogs, searchLogs } from './logs.js'
import { collectMetrics } from './metrics.js'
import { detectAnomalies } from './anomalies.js'
import { createAlert, listAlerts, resolveAlert } from './alerts.js'
import { generateMonitoringReport, saveEvidence } from './report.js'
import {
  CheckServiceHealthSchema,
  GetLogsSchema,
  SearchLogsSchema,
  CollectMetricsSchema,
  DetectAnomaliesSchema,
  CheckApiHealthSchema,
  MonitorDockerSchema,
  GenerateReportSchema,
  SaveEvidenceSchema,
  CreateAlertSchema,
  ListAlertsSchema,
  ResolveAlertSchema,
} from './types.js'
import type { McpResponse } from './types.js'

const server = new Server(
  {
    name: 'monitoring-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'check_service_health',
      description: 'Check health of a service by name or URL. Returns healthy/degraded/down status with response time.',
      inputSchema: {
        type: 'object',
        properties: {
          serviceName: { type: 'string', description: 'Name of the service to check' },
          url: { type: 'string', description: 'URL to check (alternative to serviceName)' },
        },
      },
    },
    {
      name: 'list_services',
      description: 'List all running local and Docker services with status and uptime.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_logs',
      description: 'Retrieve logs from a service or Docker container.',
      inputSchema: {
        type: 'object',
        properties: {
          serviceName: { type: 'string', description: 'Name of the service' },
          containerName: { type: 'string', description: 'Docker container name' },
          tail: { type: 'number', description: 'Number of log lines to return (default: 200)' },
        },
      },
    },
    {
      name: 'search_logs',
      description: 'Search logs for errors, exceptions, or keywords across services.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term or keyword' },
          serviceName: { type: 'string', description: 'Optional service name to scope search' },
        },
        required: ['query'],
      },
    },
    {
      name: 'collect_metrics',
      description: 'Collect CPU, memory, and performance metrics for a service or system.',
      inputSchema: {
        type: 'object',
        properties: {
          serviceName: { type: 'string', description: 'Optional service name' },
        },
      },
    },
    {
      name: 'detect_anomalies',
      description: 'Detect anomalies including error spikes, slow responses, high CPU/memory, and restart loops.',
      inputSchema: {
        type: 'object',
        properties: {
          serviceName: { type: 'string', description: 'Optional service name to scope detection' },
        },
      },
    },
    {
      name: 'check_api_health',
      description: 'Check health of an external API endpoint with HTTP status and latency.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the API to check' },
        },
        required: ['url'],
      },
    },
    {
      name: 'monitor_docker',
      description: 'Monitor Docker container status, restart count, and resource usage.',
      inputSchema: {
        type: 'object',
        properties: {
          containerName: { type: 'string', description: 'Optional container name' },
        },
      },
    },
    {
      name: 'generate_monitoring_report',
      description: 'Generate a comprehensive monitoring report in markdown format.',
      inputSchema: {
        type: 'object',
        properties: {
          featureId: { type: 'string', description: 'Feature or identifier for the report' },
          serviceName: { type: 'string', description: 'Service to generate report for' },
        },
      },
    },
    {
      name: 'save_monitoring_evidence',
      description: 'Save monitoring evidence linking findings to a traceability entity.',
      inputSchema: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Traceability entity ID' },
          findings: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of findings',
          },
          severitySummary: { type: 'string', description: 'Severity summary' },
          reportPath: { type: 'string', description: 'Path to the report' },
        },
        required: ['entityId', 'findings', 'severitySummary', 'reportPath'],
      },
    },
    {
      name: 'create_alert',
      description: 'Create a new monitoring alert with severity level.',
      inputSchema: {
        type: 'object',
        properties: {
          serviceName: { type: 'string', description: 'Service name' },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Alert severity',
          },
          message: { type: 'string', description: 'Alert message' },
        },
        required: ['serviceName', 'severity', 'message'],
      },
    },
    {
      name: 'list_alerts',
      description: 'List alerts with optional severity and status filters.',
      inputSchema: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Filter by severity',
          },
          status: {
            type: 'string',
            enum: ['open', 'acknowledged', 'resolved'],
            description: 'Filter by status',
          },
        },
      },
    },
    {
      name: 'resolve_alert',
      description: 'Mark an alert as resolved by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          alertId: { type: 'string', description: 'Alert ID to resolve' },
        },
        required: ['alertId'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params

    switch (name) {
      case 'check_service_health': {
        const { serviceName, url } = CheckServiceHealthSchema.parse(args)
        const result = await checkServiceHealth(serviceName, url)
        return formatResponse({ success: true, ...result })
      }

      case 'list_services': {
        const result = await listServices()
        return formatResponse({
          success: true,
          services: result,
          count: result.length,
        })
      }

      case 'get_logs': {
        const { serviceName, containerName, tail } = GetLogsSchema.parse(args)
        const result = await getLogs(serviceName, containerName, tail)
        return formatResponse({
          success: true,
          logs: result,
          count: result.length,
        })
      }

      case 'search_logs': {
        const { query, serviceName } = SearchLogsSchema.parse(args)
        const result = await searchLogs(query, serviceName)
        return formatResponse({
          success: true,
          query,
          matches: result,
          count: result.length,
        })
      }

      case 'collect_metrics': {
        const { serviceName } = CollectMetricsSchema.parse(args)
        const result = await collectMetrics(serviceName)
        return formatResponse({ success: true, metrics: result })
      }

      case 'detect_anomalies': {
        const { serviceName } = DetectAnomaliesSchema.parse(args)
        const result = await detectAnomalies(serviceName)
        return formatResponse({
          success: true,
          anomalies: result,
          count: result.length,
        })
      }

      case 'check_api_health': {
        const { url } = CheckApiHealthSchema.parse(args)
        const result = await checkApiHealth(url)
        return formatResponse({ success: true, ...result })
      }

      case 'monitor_docker': {
        const { containerName } = MonitorDockerSchema.parse(args)
        const services = await listServices()
        const dockerServices = services.filter(s => s.type === 'docker')
        const target = containerName
          ? dockerServices.find(s => s.name === containerName || s.containerId === containerName)
          : null

        if (containerName && !target) {
          return formatResponse({
            success: false,
            error: `Container "${containerName}" not found`,
          })
        }

        const result = target ? [target] : dockerServices
        return formatResponse({
          success: true,
          containers: result,
          count: result.length,
        })
      }

      case 'generate_monitoring_report': {
        const { featureId, serviceName } = GenerateReportSchema.parse(args)
        const report = await generateMonitoringReport(featureId, serviceName)
        return formatResponse({
          success: true,
          report,
          reportPath: `docs/product/evidence/monitoring/${report.id}.md`,
        })
      }

      case 'save_monitoring_evidence': {
        const { entityId, findings, severitySummary, reportPath } =
          SaveEvidenceSchema.parse(args)
        saveEvidence({
          entityId,
          findings,
          severitySummary,
          reportPath,
          timestamp: new Date().toISOString(),
        })
        return formatResponse({
          success: true,
          entityId,
          reportPath,
        })
      }

      case 'create_alert': {
        const { serviceName, severity, message } = CreateAlertSchema.parse(args)
        const alert = createAlert(serviceName, severity, message)
        return formatResponse({
          success: true,
          alertId: alert.id,
          alert,
        })
      }

      case 'list_alerts': {
        const { severity, status } = ListAlertsSchema.parse(args)
        const result = listAlerts(severity, status)
        return formatResponse({
          success: true,
          alerts: result,
          count: result.length,
        })
      }

      case 'resolve_alert': {
        const { alertId } = ResolveAlertSchema.parse(args)
        const alert = resolveAlert(alertId)
        if (!alert) {
          return formatResponse({
            success: false,
            error: `Alert "${alertId}" not found`,
          })
        }
        return formatResponse({
          success: true,
          alert,
        })
      }

      default:
        return formatResponse({
          success: false,
          error: `Unknown tool: ${name}`,
        })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return formatResponse({ success: false, error: message })
  }
})

function formatResponse(data: McpResponse) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Monitoring MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
