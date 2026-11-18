import { v4 as uuid } from "uuid";
import type { ServiceInfo } from "./types.js";

const services: Map<string, ServiceInfo> = new Map();

export function registerService(params: {
  type: "docker" | "process";
  name: string;
  containerId?: string;
  status?: "running" | "stopped" | "exited";
  ports?: string[];
}): ServiceInfo {
  const service: ServiceInfo = {
    id: uuid(),
    type: params.type,
    name: params.name,
    containerId: params.containerId,
    status: params.status || "running",
    ports: params.ports,
    startedAt: new Date().toISOString(),
  };
  services.set(service.id, service);
  return service;
}

export function updateServiceStatus(
  id: string,
  status: "running" | "stopped" | "exited"
): ServiceInfo | null {
  const service = services.get(id);
  if (!service) return null;
  service.status = status;
  services.set(id, service);
  return service;
}

export function getService(id: string): ServiceInfo | undefined {
  return services.get(id);
}

export function listServices(): ServiceInfo[] {
  return Array.from(services.values());
}

export function removeService(id: string): boolean {
  return services.delete(id);
}

export function clearServices(): void {
  services.clear();
}
