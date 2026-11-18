import { execa } from "execa";
import { config } from "./config.js";
import { validateCommand } from "./allowlist.js";
import { validateCwd, enforceTimeout } from "./sandbox.js";
import type { CommandResult, TestResult } from "./types.js";

export interface ExecOptions {
  command: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
}

function truncate(text: string, max: number = config.maxOutputChars): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max) + `\n\n... [truncated at ${max} characters]`, truncated: true };
}

export async function executeCommand(options: ExecOptions): Promise<CommandResult> {
  const args = options.args || [];
  const start = Date.now();

  // Validate command against allowlist
  const validation = validateCommand(options.command, args);
  if (!validation.allowed) {
    return {
      command: options.command,
      args,
      exitCode: 1,
      stdout: "",
      stderr: validation.reason || "Command blocked by allowlist",
      truncated: false,
      durationMs: Date.now() - start,
      cwd: options.cwd || config.allowedDir,
    };
  }

  // Validate working directory
  const cwdValidation = validateCwd(options.cwd);
  if (!cwdValidation.allowed) {
    return {
      command: options.command,
      args,
      exitCode: 1,
      stdout: "",
      stderr: cwdValidation.reason || "Working directory blocked",
      truncated: false,
      durationMs: Date.now() - start,
      cwd: cwdValidation.resolvedCwd,
    };
  }

  const timeout = enforceTimeout(options.timeoutMs);

  try {
    const result = await execa(options.command, args, {
      cwd: cwdValidation.resolvedCwd,
      timeout,
      reject: false,
      all: true,
    });

    const stdoutTruncated = truncate(result.stdout || "");
    const stderrTruncated = truncate(result.stderr || "");
    const allOutput = result.all || "";
    const allTruncated = truncate(allOutput);

    return {
      command: options.command,
      args,
      exitCode: result.exitCode ?? null,
      stdout: stdoutTruncated.text,
      stderr: stderrTruncated.text,
      truncated: stdoutTruncated.truncated || stderrTruncated.truncated,
      durationMs: Date.now() - start,
      cwd: cwdValidation.resolvedCwd,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      command: options.command,
      args,
      exitCode: null,
      stdout: "",
      stderr: `Execution error: ${message}`,
      truncated: false,
      durationMs: Date.now() - start,
      cwd: cwdValidation.resolvedCwd,
    };
  }
}
