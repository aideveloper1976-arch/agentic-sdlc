import { executeCommand } from "./executor.js";
import type { CommandResult } from "./types.js";

export async function dockerComposeUp(
  detach: boolean = true,
  services?: string[]
): Promise<CommandResult> {
  const args = ["compose", "up"];
  if (detach) args.push("-d");
  if (services && services.length > 0) args.push(...services);
  return executeCommand({ command: "docker", args });
}

export async function dockerComposeDown(): Promise<CommandResult> {
  return executeCommand({ command: "docker", args: ["compose", "down"] });
}

export async function dockerComposeBuild(services?: string[]): Promise<CommandResult> {
  const args = ["compose", "build"];
  if (services && services.length > 0) args.push(...services);
  return executeCommand({ command: "docker", args });
}

export async function dockerPs(): Promise<CommandResult> {
  return executeCommand({ command: "docker", args: ["ps", "--format", "{{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"] });
}

export async function dockerLogs(containerName: string, tail: number = 200): Promise<CommandResult> {
  return executeCommand({ command: "docker", args: ["logs", "--tail", String(tail), containerName] });
}

export async function dockerComposeLogs(service?: string, tail?: number): Promise<CommandResult> {
  const args = ["compose", "logs"];
  if (tail) args.push("--tail", String(tail));
  if (service) args.push(service);
  return executeCommand({ command: "docker", args });
}

export async function dockerContextUse(contextName: string): Promise<CommandResult> {
  return executeCommand({ command: "docker", args: ["context", "use", contextName] });
}

export async function dockerContextShow(): Promise<CommandResult> {
  return executeCommand({ command: "docker", args: ["context", "show"] });
}

export async function dockerContextLs(): Promise<CommandResult> {
  return executeCommand({ command: "docker", args: ["context", "ls"] });
}
