import { execa } from 'execa'
import http from 'http'
import https from 'https'
import { config } from './config.js'
import { findService, getProcessStatus } from './services.js'
import type { HealthCheckResult, HealthStatus } from './types.js'

function httpCheck(url: string, timeout: number): Promise<{ status: number; responseTime: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(url, { timeout }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        resolve({
          status: res.statusCode || 503,
          responseTime: Date.now() - start,
        })
      })
    })
    req.on('error', (err: NodeJS.ErrnoException) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

export async function checkServiceHealth(
  serviceName?: string,
  url?: string
): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'down',
    lastChecked: new Date().toISOString(),
  }

  if (url) {
    try {
      const { status, responseTime } = await httpCheck(url, config.healthTimeout)
      result.httpStatus = status
      result.responseTime = responseTime
      if (status >= 200 && status < 400) {
        result.status = 'healthy'
      } else if (status >= 400 && status < 500) {
        result.status = 'degraded'
        result.message = `HTTP ${status}`
      } else {
        result.status = 'down'
        result.message = `HTTP ${status}`
      }
    } catch (err) {
      result.status = 'down'
      result.message = err instanceof Error ? err.message : 'Connection failed'
    }
    return result
  }

  if (!serviceName) {
    result.status = 'degraded'
    result.message = 'No service name or URL provided'
    return result
  }

  const svc = await findService(serviceName)
  if (!svc) {
    result.status = 'down'
    result.message = `Service "${serviceName}" not found`
    return result
  }

  if (svc.type === 'api') {
    const port = svc.port || 80
    try {
      const { status, responseTime } = await httpCheck(`http://localhost:${port}`, config.healthTimeout)
      result.httpStatus = status
      result.responseTime = responseTime
      result.status = status < 400 ? 'healthy' : 'degraded'
    } catch (err) {
      result.status = 'down'
      result.message = err instanceof Error ? err.message : 'Connection failed'
    }
    return result
  }

  if (svc.type === 'docker' && svc.containerId) {
    try {
      const { stdout } = await execa('docker', ['inspect', '-f', '{{.State.Status}}', svc.containerId], { timeout: 5000 })
      const state = stdout.trim()
      if (state === 'running') result.status = 'healthy'
      else if (state === 'restarting' || state === 'paused') result.status = 'degraded'
      else result.status = 'down'
      result.message = `Container state: ${state}`

      if (result.status === 'healthy') {
        const ports = svc.port
        if (ports) {
          try {
            const { status, responseTime } = await httpCheck(`http://localhost:${ports}`, config.healthTimeout)
            result.httpStatus = status
            result.responseTime = responseTime
            if (status >= 400) result.status = 'degraded'
          } catch {
            // port check failed but container is running
          }
        }
      }
    } catch {
      result.status = 'down'
      result.message = 'Docker inspect failed'
    }
    return result
  }

  const status = await getProcessStatus(serviceName)
  result.status = status
  if (status === 'down') {
    result.message = 'Process not running'
  }

  return result
}

export async function checkApiHealth(url: string): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'down',
    lastChecked: new Date().toISOString(),
  }

  try {
    const { status, responseTime } = await httpCheck(url, config.healthTimeout)
    result.httpStatus = status
    result.responseTime = responseTime
    if (status >= 200 && status < 400) {
      result.status = 'healthy'
    } else if (status >= 400 && status < 500) {
      result.status = 'degraded'
      result.message = `HTTP ${status}`
    } else {
      result.status = 'down'
      result.message = `HTTP ${status}`
    }
  } catch (err) {
    result.status = 'down'
    result.message = err instanceof Error ? err.message : 'Connection failed'
  }

  return result
}
