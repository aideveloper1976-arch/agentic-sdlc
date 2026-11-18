import { config, getBasicAuthHeader } from "./config.js";
import type { ConfluencePage } from "./types.js";

function authHeaders(): Record<string, string> {
  return {
    Authorization: getBasicAuthHeader(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function confluenceFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${config.confluenceBaseUrl.replace(/\/$/, "")}${path}`;
  return fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string>) },
  });
}

export async function searchConfluencePages(
  cql: string,
  maxResults: number = 25
): Promise<ConfluencePage[]> {
  const query = encodeURIComponent(cql);
  const resp = await confluenceFetch(
    `/rest/api/content/search?cql=${query}&limit=${maxResults}&expand=space,version`,
    { signal: AbortSignal.timeout(30000) }
  );

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Confluence search failed (${resp.status}): ${maskBody(body)}`);
  }

  const data = (await resp.json()) as {
    results: Array<{
      id: string;
      title: string;
      _links: { webui?: string; base?: string };
      space?: { key: string };
      version?: { number: number; when: string };
    }>;
  };

  return data.results.map((page) => ({
    id: page.id,
    title: page.title,
    url: `${page._links.base || config.confluenceBaseUrl}${page._links.webui || ""}`,
    space: page.space?.key || "",
    version: page.version?.number || 1,
    lastModified: page.version?.when || "",
    content: null,
  }));
}

export async function getConfluencePage(pageId: string): Promise<ConfluencePage> {
  const resp = await confluenceFetch(
    `/rest/api/content/${pageId}?expand=space,version,body.storage`,
    { signal: AbortSignal.timeout(15000) }
  );

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Confluence get failed (${resp.status}): ${maskBody(body)}`);
  }

  const data = (await resp.json()) as {
    id: string;
    title: string;
    _links: { webui?: string; base?: string };
    space?: { key: string };
    version?: { number: number; when: string };
    body?: { storage?: { value: string } };
  };

  return {
    id: data.id,
    title: data.title,
    url: `${data._links.base || config.confluenceBaseUrl}${data._links.webui || ""}`,
    space: data.space?.key || "",
    version: data.version?.number || 1,
    lastModified: data.version?.when || "",
    content: data.body?.storage?.value?.slice(0, 5000) || null,
  };
}

export async function createConfluencePage(params: {
  spaceKey: string;
  title: string;
  parentPageId?: string;
  content: string;
}): Promise<{ id: string; url: string }> {
  const ancestors = params.parentPageId
    ? [{ id: params.parentPageId }]
    : [];

  const body = {
    type: "page",
    title: params.title,
    space: { key: params.spaceKey },
    ancestors,
    body: {
      storage: {
        value: params.content,
        representation: "storage",
      },
    },
  };

  const resp = await confluenceFetch("/rest/api/content", {
    method: "POST",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const respBody = await resp.text().catch(() => "");
    throw new Error(`Confluence create failed (${resp.status}): ${maskBody(respBody)}`);
  }

  const data = (await resp.json()) as { id: string; _links: { base?: string; webui?: string } };
  return {
    id: data.id,
    url: `${data._links.base || config.confluenceBaseUrl}${data._links.webui || ""}`,
  };
}

export async function updateConfluencePage(params: {
  pageId: string;
  title: string;
  content: string;
  version: number;
}): Promise<{ id: string; url: string }> {
  const body = {
    id: params.pageId,
    type: "page",
    title: params.title,
    version: { number: params.version + 1 },
    body: {
      storage: {
        value: params.content,
        representation: "storage",
      },
    },
  };

  const resp = await confluenceFetch(`/rest/api/content/${params.pageId}`, {
    method: "PUT",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const respBody = await resp.text().catch(() => "");
    throw new Error(`Confluence update failed (${resp.status}): ${maskBody(respBody)}`);
  }

  const data = (await resp.json()) as { id: string; _links: { base?: string; webui?: string } };
  return {
    id: data.id,
    url: `${data._links.base || config.confluenceBaseUrl}${data._links.webui || ""}`,
  };
}

function maskBody(body: string): string {
  const masked = body.replace(/ATLASSIAN_API_TOKEN|"token":"[^"]+"/gi, '"token":"***"');
  if (masked.length > 500) return masked.slice(0, 500) + "...";
  return masked;
}
