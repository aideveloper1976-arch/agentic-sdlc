import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { config } from './config.js'
import { checkServiceHealth } from './health.js'
import { getLogs } from './logs.js'
import { collectMetrics } from './metrics.js'
import { detectAnomalies } from './anomalies.js'
import { listServices } from './services.js'
import type { MonitoringReport, MonitoringEvidence } from './types.js'

export async function generateMonitoringReport(
  featureId?: string,
  serviceName?: string
): Promise<MonitoringReport> {
  const id = featureId || uuidv4()
  const name = serviceName || (await listServices())[0]?.name || 'system'

  const [serviceStatus, logs, metrics, anomalies] = await Promise.all([
    checkServiceHealth(name),
    getLogs(name, undefined, 500),
    collectMetrics(name),
    detectAnomalies(name),
  ])

  const errorCount = logs.filter(l => l.level === 'ERROR').length
  const warnCount = logs.filter(l => l.level === 'WARN').length

  const detectedIssues: string[] = []
  if (errorCount > 0) detectedIssues.push(`${errorCount} error(s) found in logs`)
  if (metrics.cpu > 70) detectedIssues.push(`High CPU usage: ${metrics.cpu}%`)
  if (metrics.memory > 75) detectedIssues.push(`High memory usage: ${metrics.memory}%`)
  if (serviceStatus.status !== 'healthy') detectedIssues.push(`Service status: ${serviceStatus.status}`)

  const recommendations: string[] = []
  if (errorCount > 10) recommendations.push('Investigate repeated errors in service logs')
  if (metrics.cpu > 80) recommendations.push('Consider scaling up or optimizing CPU-intensive operations')
  if (metrics.memory > 85) recommendations.push('Investigate memory leak or increase memory limit')
  if (anomalies.length > 0) recommendations.push('Review detected anomalies and take corrective action')
  if (serviceStatus.status === 'degraded') recommendations.push('Check service configuration and dependencies')
  if (recommendations.length === 0) recommendations.push('Service is operating normally. Continue monitoring.')

  const report: MonitoringReport = {
    id,
    serviceName: name,
    timestamp: new Date().toISOString(),
    serviceStatus,
    logSummary: {
      totalLines: logs.length,
      errors: errorCount,
      warnings: warnCount,
    },
    metricsSnapshot: metrics,
    detectedIssues,
    anomalies,
    recommendations,
  }

  const reportPath = path.join(config.reportsDir, `${id}.md`)
  const reportMarkdown = formatReportAsMarkdown(report)
  saveEvidence({
    entityId: id,
    findings: detectedIssues,
    severitySummary: anomalies.length > 0
      ? anomalies[0].severity
      : serviceStatus.status === 'healthy' ? 'low' : 'medium',
    reportPath,
    timestamp: report.timestamp,
  })

  try {
    fs.mkdirSync(config.reportsDir, { recursive: true })
    fs.writeFileSync(reportPath, reportMarkdown, 'utf-8')
  } catch {
    // report dir not writable
  }

  return report
}

function formatReportAsMarkdown(report: MonitoringReport): string {
  const lines: string[] = [
    `# Monitoring Report`,
    ``,
    `**Report ID:** ${report.id}`,
    `**Service:** ${report.serviceName}`,
    `**Timestamp:** ${report.timestamp}`,
    ``,
    `---`,
    ``,
    `## Service Status`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Status | ${report.serviceStatus.status} |`,
    `| Response Time | ${report.serviceStatus.responseTime ? report.serviceStatus.responseTime + 'ms' : 'N/A'} |`,
    `| HTTP Status | ${report.serviceStatus.httpStatus || 'N/A'} |`,
    `| Message | ${report.serviceStatus.message || 'OK'} |`,
    `| Last Checked | ${report.serviceStatus.lastChecked} |`,
    ``,
    `## Logs Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Lines | ${report.logSummary.totalLines} |`,
    `| Errors | ${report.logSummary.errors} |`,
    `| Warnings | ${report.logSummary.warnings} |`,
    ``,
    `## Metrics Snapshot`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| CPU Usage | ${report.metricsSnapshot.cpu}% |`,
    `| Memory Usage | ${report.metricsSnapshot.memory}% |`,
    `| Uptime | ${report.metricsSnapshot.uptime || 0}s |`,
  ]

  if (report.metricsSnapshot.responseTime !== undefined) {
    lines.push(`| Response Time | ${report.metricsSnapshot.responseTime}ms |`)
  }

  lines.push(
    ``,
    `## Detected Issues`,
    ``,
  )

  if (report.detectedIssues.length === 0) {
    lines.push(`No issues detected.`)
  } else {
    for (const issue of report.detectedIssues) {
      lines.push(`- ${issue}`)
    }
  }

  lines.push(
    ``,
    `## Anomalies`,
    ``,
  )

  if (report.anomalies.length === 0) {
    lines.push(`No anomalies detected.`)
  } else {
    lines.push(`| Type | Severity | Message | Value |`)
    lines.push(`|------|----------|---------|-------|`)
    for (const anomaly of report.anomalies) {
      lines.push(`| ${anomaly.type} | ${anomaly.severity} | ${anomaly.message} | ${anomaly.value} |`)
    }
  }

  lines.push(
    ``,
    `## Recommendations`,
    ``,
  )

  for (const rec of report.recommendations) {
    lines.push(`- ${rec}`)
  }

  lines.push(``)

  return lines.join('\n')
}

export function saveEvidence(evidence: MonitoringEvidence): void {
  const evidencePath = path.join(
    config.evidenceDir,
    `evidence-${evidence.entityId}.json`
  )
  try {
    fs.mkdirSync(config.evidenceDir, { recursive: true })
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf-8')
  } catch {
    // ignore write errors
  }
}
