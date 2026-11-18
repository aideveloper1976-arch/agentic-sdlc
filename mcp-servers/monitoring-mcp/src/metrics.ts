import { execa, execaSync } from 'execa'
import os from 'os'
import fs from 'fs'
import type { MetricsSnapshot } from './types.js'

let systemCpuIdle = 0
let systemCpuTotal = 0

function getCpuUsage(): number {
  try {
    const stat = fs.readFileSync('/proc/stat', 'utf-8')
    const cpuLine = stat.split('\n').find(l => l.startsWith('cpu '))
    if (!cpuLine) return 0
    const parts = cpuLine.trim().split(/\s+/).slice(1).map(Number)
    const idle = parts[3] || 0
    const total = parts.reduce((a: number, b: number) => a + b, 0)

    if (systemCpuIdle === 0) {
      systemCpuIdle = idle
      systemCpuTotal = total
      return 0
    }

    const deltaIdle = idle - systemCpuIdle
    const deltaTotal = total - systemCpuTotal
    systemCpuIdle = idle
    systemCpuTotal = total

    if (deltaTotal === 0) return 0
    return Math.round((1 - deltaIdle / deltaTotal) * 100)
  } catch {
    // macOS fallback
    try {
      const { stdout } = execaSync('ps', ['-A', '-o', '%cpu='])
      const lines = stdout.trim().split('\n').filter(Boolean)
      if (lines.length === 0) return 0
      const totalCpu = lines.reduce((sum: number, line: string) => sum + parseFloat(line.trim() || '0'), 0)
      return Math.min(Math.round(totalCpu / os.cpus().length), 100)
    } catch {
      return 0
    }
  }
}

function getMemoryUsage(): number {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  if (totalMem === 0) return 0
  return Math.round(((totalMem - freeMem) / totalMem) * 100)
}

async function getProcessMetrics(): Promise<{ count: number; cpu: number; mem: number }> {
  try {
    const { stdout } = await execa('ps', ['-A', '-o', '%cpu=,rss='], { timeout: 3000 })
    const lines = stdout.trim().split('\n').filter(Boolean)
    let totalCpu = 0
    let totalMem = 0
    for (const line of lines) {
      const [cpu, rss] = line.trim().split(/\s+/)
      totalCpu += parseFloat(cpu || '0')
      totalMem += parseInt(rss || '0', 10)
    }
    return {
      count: lines.length,
      cpu: Math.round(totalCpu / os.cpus().length),
      mem: Math.round((totalMem / os.totalmem()) * 100),
    }
  } catch {
    return { count: 0, cpu: getCpuUsage(), mem: getMemoryUsage() }
  }
}

function getUptime(): number {
  try {
    const { stdout } = execaSync('uptime', ['-s'])
    const bootTime = new Date(stdout.trim()).getTime()
    return Math.floor((Date.now() - bootTime) / 1000)
  } catch {
    return os.uptime()
  }
}

export async function collectMetrics(serviceName?: string): Promise<MetricsSnapshot> {
  const procMetrics = await getProcessMetrics()

  const snapshot: MetricsSnapshot = {
    cpu: procMetrics.cpu,
    memory: procMetrics.mem,
    uptime: getUptime(),
    processCount: procMetrics.count,
    timestamp: new Date().toISOString(),
  }

  if (serviceName) {
    try {
      const { stdout } = await execa('ps', ['-C', serviceName, '-o', '%cpu=,rss='], { timeout: 3000 })
      const lines = stdout.trim().split('\n').filter(Boolean)
      if (lines.length > 0) {
        const [cpu, rss] = lines[0].trim().split(/\s+/)
        snapshot.cpu = parseFloat(cpu || '0')
        snapshot.memory = parseInt(rss || '0', 10) > 0
          ? Math.round((parseInt(rss, 10) / os.totalmem()) * 100)
          : 0
      }
    } catch {
      // process not found, keep system metrics
    }
  }

  return snapshot
}
