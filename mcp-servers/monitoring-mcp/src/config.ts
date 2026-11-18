import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

export const config = {
  port: parseInt(process.env.MCP_PORT || '0', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logMaxLines: parseInt(process.env.LOG_MAX_LINES || '200', 10),
  logMaxSize: parseInt(process.env.LOG_MAX_SIZE || '1048576', 10),
  metricsInterval: parseInt(process.env.METRICS_INTERVAL || '30000', 10),
  alertsDir: process.env.ALERTS_DIR || path.join(process.cwd(), 'docs', 'product', 'evidence', 'incidents'),
  reportsDir: process.env.REPORTS_DIR || path.join(process.cwd(), 'docs', 'product', 'evidence', 'monitoring'),
  evidenceDir: process.env.EVIDENCE_DIR || path.join(process.cwd(), 'docs', 'product', 'evidence'),
  allowedServices: (process.env.ALLOWED_SERVICES || '*').split(','),
  dockerEnabled: process.env.DOCKER_ENABLED !== 'false',
  healthTimeout: parseInt(process.env.HEALTH_TIMEOUT || '5000', 10),
  anomalyThresholds: {
    cpuHigh: parseInt(process.env.ANOMALY_CPU_HIGH || '80', 10),
    memoryHigh: parseInt(process.env.ANOMALY_MEMORY_HIGH || '85', 10),
    errorSpikeCount: parseInt(process.env.ANOMALY_ERROR_SPIKE || '10', 10),
    slowResponseMs: parseInt(process.env.ANOMALY_SLOW_RESPONSE || '3000', 10),
    restartCount: parseInt(process.env.ANOMALY_RESTART_COUNT || '3', 10),
  },
}

export function isServiceAllowed(serviceName: string): boolean {
  if (config.allowedServices.includes('*')) return true
  return config.allowedServices.includes(serviceName)
}
