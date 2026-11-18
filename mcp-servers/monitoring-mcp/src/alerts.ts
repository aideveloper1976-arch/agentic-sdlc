import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { config } from './config.js'
import type { Alert, AlertStatus, SeverityLevel } from './types.js'

const alerts: Alert[] = []
const alertsFilePath = path.join(config.alertsDir, 'alerts.json')

export function loadAlerts(): Alert[] {
  try {
    if (fs.existsSync(alertsFilePath)) {
      const data = fs.readFileSync(alertsFilePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch {
    // ignore corrupted file
  }
  return []
}

export function saveAlerts(): void {
  try {
    fs.mkdirSync(config.alertsDir, { recursive: true })
    fs.writeFileSync(alertsFilePath, JSON.stringify(alerts, null, 2), 'utf-8')
  } catch {
    // ignore write errors
  }
}

export function createAlert(
  serviceName: string,
  severity: SeverityLevel,
  message: string,
): Alert {
  const savedAlerts = loadAlerts()
  savedAlerts.push(...alerts)
  alerts.length = 0
  alerts.push(...savedAlerts)

  const alert: Alert = {
    id: uuidv4(),
    serviceName,
    severity,
    message,
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  alerts.push(alert)
  saveAlerts()
  return alert
}

export function listAlerts(severity?: SeverityLevel, status?: AlertStatus): Alert[] {
  const savedAlerts = loadAlerts()
  const allAlerts = [...savedAlerts, ...alerts]
  const seen = new Set<string>()
  const unique: Alert[] = []
  for (const a of allAlerts) {
    if (!seen.has(a.id)) {
      seen.add(a.id)
      unique.push(a)
    }
  }

  let filtered = unique
  if (severity) filtered = filtered.filter(a => a.severity === severity)
  if (status) filtered = filtered.filter(a => a.status === status)
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function resolveAlert(alertId: string): Alert | null {
  const savedAlerts = loadAlerts()
  const allAlerts = [...savedAlerts, ...alerts]
  const alert = allAlerts.find(a => a.id === alertId)
  if (!alert) return null

  alert.status = 'resolved'
  alert.resolvedAt = new Date().toISOString()

  const merged = [...alerts]
  const savedIdx = savedAlerts.findIndex(a => a.id === alertId)
  if (savedIdx >= 0) {
    savedAlerts[savedIdx] = alert
    saveAlerts()
  }
  const idx = alerts.findIndex(a => a.id === alertId)
  if (idx >= 0) alerts[idx] = alert

  const allMerged = [...savedAlerts, ...alerts]
  const seen = new Set<string>()
  const unique: Alert[] = []
  for (const a of allMerged) {
    if (!seen.has(a.id)) {
      seen.add(a.id)
      unique.push(a)
    }
  }
  alerts.length = 0
  alerts.push(...unique)
  saveAlerts()

  return alert
}
