import { config } from "./config.js";
import type { SearchResult } from "./types.js";

interface SearxngResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content?: string;
    snippet?: string;
    engine?: string;
    source?: string;
  }>;
  answers?: string[];
  infoboxes?: unknown[];
  suggestions?: string[];
  number_of_results?: number;
}

async function fetchFromSearxng(
  baseUrl: string,
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("categories", "general");
  url.searchParams.set("pageno", "1");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `SearXNG returned ${response.status}: ${response.statusText}`
    );
  }

  const data = (await response.json()) as SearxngResponse;

  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.slice(0, maxResults).map((r) => ({
    title: r.title || "Untitled",
    url: r.url,
    snippet: r.content || r.snippet || "",
    source: r.engine || r.source || "searxng",
    engine: "searxng",
  }));
}

export async function searchSearxng(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    return await fetchFromSearxng(config.searxngUrl, query, maxResults);
  } catch (primaryError) {
    if (config.searxngBackupUrl) {
      console.error(
        `Primary SearXNG (${config.searxngUrl}) failed, trying backup: ${config.searxngBackupUrl}`
      );
      try {
        return await fetchFromSearxng(config.searxngBackupUrl, query, maxResults);
      } catch (backupError) {
        throw new Error(
          `Primary SearXNG failed (${(primaryError as Error).message}) and backup SearXNG also failed (${(backupError as Error).message})`
        );
      }
    }
    throw primaryError;
  }
}
