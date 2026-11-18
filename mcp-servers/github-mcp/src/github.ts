import { getConfig, maskToken } from "./config";
import type { MCPErrorResponse, MCPSuccessResponse, MCPResponse } from "./types";

const BASE_URL = "https://api.github.com";

interface GitHubRequestOptions {
  method?: string;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  accept?: string;
}

export async function githubRequest<T>(options: GitHubRequestOptions): Promise<T> {
  const config = getConfig();
  const { method = "GET", path, body, params, accept } = options;

  let url = `${BASE_URL}/repos/${config.githubOwner}/${config.githubRepo}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.githubToken}`,
    Accept: accept || "application/vnd.github.v3+json",
    "User-Agent": "opencode-github-mcp",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      errorBody = "Unknown error";
    }

    const maskedToken = maskToken(config.githubToken);
    const errorMessage = `GitHub API error (${response.status}): ${errorBody}`;
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data = (await response.json()) as T;
  return data;
}

export async function githubRequestRaw(options: GitHubRequestOptions): Promise<Response> {
  const config = getConfig();
  const { method = "GET", path, body, params } = options;

  let url = `${BASE_URL}/repos/${config.githubOwner}/${config.githubRepo}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.githubToken}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "opencode-github-mcp",
  };

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function successResponse(data: unknown): MCPSuccessResponse {
  return { success: true, data };
}

export function errorResponse(message: string): MCPErrorResponse {
  return { success: false, error: message };
}

export function handleError(error: unknown): MCPResponse {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("GITHUB_TOKEN") ||
    message.includes("GITHUB_OWNER") ||
    message.includes("GITHUB_REPO")
  ) {
    return errorResponse("GitHub MCP is not properly configured. Check your environment variables.");
  }
  return errorResponse(message);
}
