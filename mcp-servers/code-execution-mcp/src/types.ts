export interface CommandResult {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  durationMs: number;
  cwd: string;
}

export interface TestResult {
  framework: string;
  command: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
  output: string;
}

export interface ServiceInfo {
  id: string;
  type: "docker" | "process";
  name: string;
  containerId?: string;
  status: "running" | "stopped" | "exited";
  ports?: string[];
  startedAt?: string;
}

export interface ProjectInfo {
  language: string | null;
  framework: string | null;
  packageManager: string | null;
  hasDockerCompose: boolean;
  hasDockerfile: boolean;
  scripts: string[];
  dependencies: number;
  devDependencies: number;
}

export interface DockerContext {
  name: string;
  current: boolean;
  dockerEndpoint?: string;
}
