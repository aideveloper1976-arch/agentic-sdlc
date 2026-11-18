import { execa } from 'execa'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { config } from './config.js'
import type { LogEntry, LogLevel } from './types.js'

const LOG_LEVELS: Record<string, LogLevel> = {
  ERROR: 'ERROR',
  ERR: 'ERROR',
  FATAL: 'ERROR',
  CRIT: 'ERROR',
  WARN: 'WARN',
  WARNING: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'DEBUG',
}

export function classifyLogLevel(message: string): LogLevel {
  const upper = message.toUpperCase()
  for (const [pattern, level] of Object.entries(LOG_LEVELS)) {
    if (upper.includes(pattern)) return level
  }
  return 'INFO'
}

export function parseLogLine(line: string, source?: string): LogEntry | null {
  if (!line.trim()) return null
  const timestamp = new Date().toISOString()
  const level = classifyLogLevel(line)
  return {
    timestamp,
    level,
    message: line.slice(0, 2000),
    source,
  }
}

export async function getLocalLogs(serviceName?: string, tail: number = 200): Promise<LogEntry[]> {
  const logs: LogEntry[] = []

  const logPaths = [
    '/var/log/system.log',
    '/var/log/syslog',
    ...(serviceName ? [path.join(os.homedir(), '.pm2', 'logs', `${serviceName}-out.log`)] : []),
  ].filter(p => fs.existsSync(p))

  for (const logPath of logPaths) {
    try {
      const { stdout } = await execa('tail', ['-n', String(Math.min(tail, 500)), logPath], { timeout: 5000 })
      const lines = stdout.trim().split('\n').filter(Boolean)
      for (const line of lines.slice(-tail)) {
        const entry = parseLogLine(line, logPath)
        if (entry) logs.push(entry)
      }
    } catch {
      // skip unreadable logs
    }
  }

  return logs.slice(-tail)
}

export async function getDockerLogs(containerName: string, tail: number = 200): Promise<LogEntry[]> {
  const logs: LogEntry[] = []
  if (!config.dockerEnabled) return logs

  try {
    const { stdout } = await execa('docker', ['logs', '--tail', String(Math.min(tail, 500)), containerName], { timeout: 10000 })
    const lines = stdout.trim().split('\n').filter(Boolean)
    for (const line of lines.slice(-tail)) {
      const entry = parseLogLine(line, containerName)
      if (entry) logs.push(entry)
    }
  } catch {
    // docker logs not available
  }

  return logs
}

export async function getLogs(
  serviceName?: string,
  containerName?: string,
  tail: number = 200
): Promise<LogEntry[]> {
  tail = Math.min(Math.max(tail, 10), 1000)

  if (containerName) {
    return getDockerLogs(containerName, tail)
  }
  if (serviceName) {
    const dockerLogs = await getDockerLogs(serviceName, tail)
    if (dockerLogs.length > 0) return dockerLogs
  }
  return getLocalLogs(serviceName, tail)
}

export async function searchLogs(
  query: string,
  serviceName?: string
): Promise<LogEntry[]> {
  const logs = await getLogs(serviceName, undefined, 1000)
  const lowerQuery = query.toLowerCase()
  return logs.filter(entry =>
    entry.message.toLowerCase().includes(lowerQuery) ||
    entry.level.toLowerCase().includes(lowerQuery)
  ).slice(0, 100)
}
