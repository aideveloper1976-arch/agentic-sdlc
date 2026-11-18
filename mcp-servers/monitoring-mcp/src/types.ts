import { z } from 'zod'

export type HealthStatus = 'healthy' | 'degraded' | 'down'

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export type ServiceType = 'local' | 'docker' | 'api'

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

export interface ServiceInfo {
  name: string
  type: ServiceType
  status: HealthStatus
  uptime?: number
  pid?: number
  containerId?: string
  port?: number
}

export interface HealthCheckResult {
  status: HealthStatus
  responseTime?: number
  httpStatus?: number
  message?: string
  lastChecked: string
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  serviceName?: string
  source?: string
  line?: number
}

export interface MetricsSnapshot {
  cpu: number
  memory: number
  responseTime?: number
  uptime?: number
  processCount?: number
  timestamp: string
}

export interface AnomalyResult {
  type: 'error_spike' | 'slow_response' | 'high_cpu' | 'high_memory' | 'restart_loop'
  severity: SeverityLevel
  serviceName: string
  message: string
  value: number
  threshold: number
  timestamp: string
}

export interface Alert {
  id: string
  serviceName: string
  severity: SeverityLevel
  message: string
  status: AlertStatus
  createdAt: string
  resolvedAt?: string
}

export interface MonitoringReport {
  id: string
  serviceName: string
  timestamp: string
  serviceStatus: HealthCheckResult
  logSummary: {
    totalLines: number
    errors: number
    warnings: number
  }
  metricsSnapshot: MetricsSnapshot
  detectedIssues: string[]
  anomalies: AnomalyResult[]
  recommendations: string[]
}

export interface MonitoringEvidence {
  entityId: string
  findings: string[]
  severitySummary: string
  reportPath: string
  timestamp: string
}

export const CheckServiceHealthSchema = z.object({
  serviceName: z.string().optional(),
  url: z.string().optional(),
})

export const GetLogsSchema = z.object({
  serviceName: z.string().optional(),
  containerName: z.string().optional(),
  tail: z.number().default(200),
})

export const SearchLogsSchema = z.object({
  query: z.string(),
  serviceName: z.string().optional(),
})

export const CollectMetricsSchema = z.object({
  serviceName: z.string().optional(),
})

export const DetectAnomaliesSchema = z.object({
  serviceName: z.string().optional(),
})

export const CheckApiHealthSchema = z.object({
  url: z.string(),
})

export const MonitorDockerSchema = z.object({
  containerName: z.string().optional(),
})

export const GenerateReportSchema = z.object({
  featureId: z.string().optional(),
  serviceName: z.string().optional(),
})

export const SaveEvidenceSchema = z.object({
  entityId: z.string(),
  findings: z.array(z.string()),
  severitySummary: z.string(),
  reportPath: z.string(),
})

export const CreateAlertSchema = z.object({
  serviceName: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string(),
})

export const ListAlertsSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
})

export const ResolveAlertSchema = z.object({
  alertId: z.string(),
})

export interface McpResponse {
  success: boolean
  [key: string]: unknown
}
