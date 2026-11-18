import { config } from './config.js'
import { collectMetrics } from './metrics.js'
import { getLogs } from './logs.js'
import { findService } from './services.js'
import type { AnomalyResult } from './types.js'

async function detectErrorSpikes(serviceName?: string): Promise<AnomalyResult[]> {
  const anomalies: AnomalyResult[] = []
  const logs = await getLogs(serviceName, undefined, 200)
  const recentLogs = logs.slice(-100)
  const errorCount = recentLogs.filter(l => l.level === 'ERROR').length

  if (errorCount >= config.anomalyThresholds.errorSpikeCount) {
    anomalies.push({
      type: 'error_spike',
      severity: errorCount >= 20 ? 'critical' : 'high',
      serviceName: serviceName || 'system',
      message: `Error spike detected: ${errorCount} errors in last ${recentLogs.length} log lines`,
      value: errorCount,
      threshold: config.anomalyThresholds.errorSpikeCount,
      timestamp: new Date().toISOString(),
    })
  }

  return anomalies
}

async function detectSlowResponses(serviceName?: string): Promise<AnomalyResult[]> {
  const anomalies: AnomalyResult[] = []
  const logs = await getLogs(serviceName, undefined, 200)
  const slowPatterns = logs.filter(l =>
    l.message.toLowerCase().includes('slow') ||
    l.message.toLowerCase().includes('timeout') ||
    l.message.toLowerCase().includes('timed out') ||
    l.message.toLowerCase().includes('latency') ||
    (l.message.includes('ms') && /\d{4,}ms/.test(l.message))
  )

  if (slowPatterns.length >= 3) {
    anomalies.push({
      type: 'slow_response',
      severity: slowPatterns.length >= 10 ? 'critical' : 'high',
      serviceName: serviceName || 'system',
      message: `Slow response detected: ${slowPatterns.length} slow operations in recent logs`,
      value: slowPatterns.length,
      threshold: 3,
      timestamp: new Date().toISOString(),
    })
  }

  return anomalies
}

async function detectHighResourceUsage(serviceName?: string): Promise<AnomalyResult[]> {
  const anomalies: AnomalyResult[] = []
  const metrics = await collectMetrics(serviceName)

  if (metrics.cpu >= config.anomalyThresholds.cpuHigh) {
    anomalies.push({
      type: 'high_cpu',
      severity: metrics.cpu >= 95 ? 'critical' : 'high',
      serviceName: serviceName || 'system',
      message: `High CPU usage: ${metrics.cpu}% (threshold: ${config.anomalyThresholds.cpuHigh}%)`,
      value: metrics.cpu,
      threshold: config.anomalyThresholds.cpuHigh,
      timestamp: new Date().toISOString(),
    })
  }

  if (metrics.memory >= config.anomalyThresholds.memoryHigh) {
    anomalies.push({
      type: 'high_memory',
      severity: metrics.memory >= 95 ? 'critical' : 'high',
      serviceName: serviceName || 'system',
      message: `High memory usage: ${metrics.memory}% (threshold: ${config.anomalyThresholds.memoryHigh}%)`,
      value: metrics.memory,
      threshold: config.anomalyThresholds.memoryHigh,
      timestamp: new Date().toISOString(),
    })
  }

  return anomalies
}

async function detectDockerRestartLoops(serviceName?: string): Promise<AnomalyResult[]> {
  const anomalies: AnomalyResult[] = []
  if (!config.dockerEnabled) return anomalies

  try {
    const { execa } = await import('execa')
    const containerName = serviceName || ''
    const { stdout } = await execa(
      'docker',
      ['inspect', '-f', '{{.RestartCount}}', containerName],
      { timeout: 3000, reject: false }
    )

    if (stdout) {
      const restartCount = parseInt(stdout.trim(), 10)
      if (restartCount >= config.anomalyThresholds.restartCount) {
        anomalies.push({
          type: 'restart_loop',
          severity: restartCount >= 10 ? 'critical' : 'high',
          serviceName: containerName || 'docker',
          message: `Container restart loop: ${restartCount} restarts`,
          value: restartCount,
          threshold: config.anomalyThresholds.restartCount,
          timestamp: new Date().toISOString(),
        })
      }
    }
  } catch {
    // docker not available
  }

  return anomalies
}

export async function detectAnomalies(serviceName?: string): Promise<AnomalyResult[]> {
  const results = await Promise.all([
    detectErrorSpikes(serviceName),
    detectSlowResponses(serviceName),
    detectHighResourceUsage(serviceName),
    detectDockerRestartLoops(serviceName),
  ])

  return results.flat().sort((a, b) => {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
  })
}
