import dotenv from "dotenv";
import { GitHubConfigSchema, type GitHubConfig, type MCPErrorResponse } from "./types";

dotenv.config();

function loadConfig(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  const parsed = GitHubConfigSchema.safeParse({
    githubToken: token,
    githubOwner: owner,
    githubRepo: repo,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing or invalid environment variables: ${missing}. Check your .env file or OpenCode MCP configuration.`
    );
  }

  return parsed.data;
}

let _config: GitHubConfig | null = null;

export function getConfig(): GitHubConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export function maskToken(token: string): string {
  if (token.length <= 8) return token.slice(0, 2) + "****";
  return token.slice(0, 4) + "****" + token.slice(-4);
}

export function configError(): MCPErrorResponse {
  return {
    success: false,
    error: "GitHub MCP not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.",
  };
}
