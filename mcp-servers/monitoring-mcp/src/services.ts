import { execa } from 'execa'
import { config, isServiceAllowed } from './config.js'
import type { ServiceInfo, HealthStatus } from './types.js'

export async function listLocalServices(): Promise<ServiceInfo[]> {
  const services: ServiceInfo[] = []
  try {
    const { stdout } = await execa('ps', ['aux', '--no-headers'], { timeout: 5000 })
    const lines = stdout.trim().split('\n').filter(Boolean)

    const seen = new Set<string>()
    for (const line of lines.slice(0, 50)) {
      const parts = line.trim().split(/\s+/)
      const pid = parseInt(parts[1], 10)
      const cpu = parseFloat(parts[2])
      const mem = parseFloat(parts[3])
      const command = parts.slice(10).join(' ')
      const name = command.split(' ').find(s => s.includes('/')) || command.slice(0, 60)

      if (!name || name.startsWith('[') || seen.has(name)) continue
      seen.add(name)

      if (config.allowedServices.includes('*') || config.allowedServices.some(s => name.includes(s))) {
        services.push({
          name: name.slice(0, 80),
          type: 'local',
          status: 'healthy',
          pid,
          uptime: Math.floor(Date.now() / 1000 - parseInt(parts[8] || '0', 10)),
        })
      }
    }
  } catch {
    // ps failed - return what we have
  }
  return services.slice(0, 20)
}

export async function listDockerServices(): Promise<ServiceInfo[]> {
  const services: ServiceInfo[] = []
  if (!config.dockerEnabled) return services

  try {
    const { stdout } = await execa('docker', ['ps', '--format', '{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}'], { timeout: 5000 })
    const lines = stdout.trim().split('\n').filter(Boolean)

    for (const line of lines) {
      const [containerId, name, status, ports] = line.split('\t')
      let statusType: HealthStatus = 'healthy'
      if (status.includes('Exited') || status.includes('unhealthy')) {
        statusType = 'down'
      } else if (status.includes('restarting') || status.includes('starting')) {
        statusType = 'degraded'
      }

      const uptimeMatch = status.match(/(\d+)\s*(second|minute|hour|day|week|month)/)
      let uptime = 0
      if (uptimeMatch) {
        const val = parseInt(uptimeMatch[1], 10)
        const unit = uptimeMatch[2]
        const multipliers: Record<string, number> = {
          second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2592000,
        }
        uptime = val * (multipliers[unit] || 1)
      }

      const portMatch = ports.match(/(\d+)->/)
      const port = portMatch ? parseInt(portMatch[1], 10) : undefined

      services.push({
        name,
        type: 'docker',
        status: statusType,
        containerId: containerId.slice(0, 12),
        uptime,
        port,
      })
    }
  } catch {
    // docker not available
  }
  return services
}

export async function listServices(): Promise<ServiceInfo[]> {
  const [local, docker] = await Promise.all([
    listLocalServices(),
    listDockerServices(),
  ])
  return [...local, ...docker]
}

export async function findService(name: string): Promise<ServiceInfo | undefined> {
  if (!isServiceAllowed(name)) return undefined
  const services = await listServices()
  return services.find(s =>
    s.name === name || s.name.includes(name) || s.containerId === name
  )
}

export async function getServiceUptime(name: string): Promise<number | undefined> {
  const svc = await findService(name)
  return svc?.uptime
}

export async function getProcessStatus(name: string): Promise<HealthStatus> {
  try {
    const svc = await findService(name)
    if (!svc) return 'down'
    if (svc.type === 'docker' && svc.containerId) {
      const { stdout } = await execa('docker', ['inspect', '-f', '{{.State.Status}}', svc.containerId], { timeout: 3000 })
      const state = stdout.trim()
      if (state === 'running') return 'healthy'
      if (state === 'restarting' || state === 'paused') return 'degraded'
      return 'down'
    }
    if (svc.pid) {
      try {
        await execa('kill', ['-0', String(svc.pid)], { timeout: 2000 })
        return 'healthy'
      } catch {
        return 'down'
      }
    }
    return 'degraded'
  } catch {
    return 'down'
  }
}
