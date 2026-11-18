import { config, getBasicAuthHeader } from "./config.js";
import type { JiraIssue } from "./types.js";

function authHeaders(): Record<string, string> {
  return {
    Authorization: getBasicAuthHeader(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function jiraFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${config.jiraBaseUrl.replace(/\/$/, "")}${path}`;
  return fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string>) },
  });
}

export async function searchJiraIssues(
  jql: string,
  maxResults: number = 50
): Promise<JiraIssue[]> {
  const query = encodeURIComponent(jql);
  const resp = await jiraFetch(
    `/rest/api/3/search?jql=${query}&maxResults=${maxResults}&expand=renderedFields,issuelinks`,
    { signal: AbortSignal.timeout(30000) }
  );

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Jira search failed (${resp.status}): ${maskBody(body)}`);
  }

  const data = (await resp.json()) as {
    issues: Array<{
      id: string;
      key: string;
      self: string;
      fields: {
        summary: string;
        description?: { content?: unknown[] };
        status: { name: string };
        issuetype: { name: string };
        labels: string[];
        parent?: { key: string };
        issuelinks?: Array<{
          type: { name: string; inward?: string; outward?: string };
          outwardIssue?: { key: string };
          inwardIssue?: { key: string };
        }>;
      };
    }>;
  };

  return data.issues.map((issue) => ({
    id: issue.id,
    key: issue.key,
    url: `${config.jiraBaseUrl.replace(/\/$/, "")}/browse/${issue.key}`,
    summary: issue.fields.summary,
    description: extractDescription(issue.fields.description),
    status: issue.fields.status.name,
    type: issue.fields.issuetype.name,
    labels: issue.fields.labels || [],
    parentKey: issue.fields.parent?.key || null,
    issueLinks: (issue.fields.issuelinks || []).map((link) => ({
      type: link.type.name,
      outwardKey: link.outwardIssue?.key,
      inwardKey: link.inwardIssue?.key,
    })),
  }));
}

export async function getJiraIssue(issueKey: string): Promise<JiraIssue> {
  const resp = await jiraFetch(`/rest/api/3/issue/${issueKey}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Jira get failed (${resp.status}): ${maskBody(body)}`);
  }

  const data = (await resp.json()) as {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      description?: { content?: unknown[] };
      status: { name: string };
      issuetype: { name: string };
      labels: string[];
      parent?: { key: string };
      issuelinks?: Array<{
        type: { name: string };
        outwardIssue?: { key: string };
        inwardIssue?: { key: string };
      }>;
    };
  };

  return {
    id: data.id,
    key: data.key,
    url: `${config.jiraBaseUrl.replace(/\/$/, "")}/browse/${data.key}`,
    summary: data.fields.summary,
    description: extractDescription(data.fields.description),
    status: data.fields.status.name,
    type: data.fields.issuetype.name,
    labels: data.fields.labels || [],
    parentKey: data.fields.parent?.key || null,
    issueLinks: (data.fields.issuelinks || []).map((link) => ({
      type: link.type.name,
      outwardKey: link.outwardIssue?.key,
      inwardKey: link.inwardIssue?.key,
    })),
  };
}

export async function createJiraIssue(params: {
  projectKey: string;
  summary: string;
  description?: string;
  issueType: string;
  parentKey?: string;
  labels?: string[];
}): Promise<{ key: string; url: string }> {
  const fields: Record<string, unknown> = {
    project: { key: params.projectKey },
    summary: params.summary,
    issuetype: { name: params.issueType },
  };

  if (params.description) {
    fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: params.description }],
        },
      ],
    };
  }

  if (params.parentKey) {
    fields.parent = { key: params.parentKey };
  }

  if (params.labels && params.labels.length > 0) {
    fields.labels = params.labels;
  }

  const resp = await jiraFetch("/rest/api/3/issue", {
    method: "POST",
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Jira create failed (${resp.status}): ${maskBody(body)}`);
  }

  const data = (await resp.json()) as { key: string; id: string };
  return {
    key: data.key,
    url: `${config.jiraBaseUrl.replace(/\/$/, "")}/browse/${data.key}`,
  };
}

export async function updateJiraIssue(
  issueKey: string,
  fields: Record<string, unknown>
): Promise<void> {
  const resp = await jiraFetch(`/rest/api/3/issue/${issueKey}`, {
    method: "PUT",
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Jira update failed (${resp.status}): ${maskBody(body)}`);
  }
}

function extractDescription(desc: { content?: unknown[] } | undefined): string | null {
  if (!desc || !desc.content) return null;
  try {
    return JSON.stringify(desc);
  } catch {
    return null;
  }
}

function maskBody(body: string): string {
  const masked = body.replace(/ATLASSIAN_API_TOKEN|"token":"[^"]+"/gi, '"token":"***"');
  if (masked.length > 500) return masked.slice(0, 500) + "...";
  return masked;
}
