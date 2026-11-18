import path from "path";
import { config } from "./config.js";

export interface SandboxResult {
  allowed: boolean;
  resolvedCwd: string;
  reason?: string;
}

export function validateCwd(requestedCwd?: string): SandboxResult {
  const allowedDir = path.resolve(config.allowedDir);

  let cwd: string;
  if (requestedCwd) {
    cwd = path.resolve(requestedCwd);
  } else {
    cwd = allowedDir;
  }

  if (!cwd.startsWith(allowedDir)) {
    return {
      allowed: false,
      resolvedCwd: cwd,
      reason: `Working directory ${cwd} is outside allowed directory ${allowedDir}`,
    };
  }

  return { allowed: true, resolvedCwd: cwd };
}

export function enforceTimeout(timeoutMs?: number): number {
  if (timeoutMs && timeoutMs > 0 && timeoutMs <= 300000) {
    return timeoutMs;
  }
  return config.defaultTimeoutMs;
}
