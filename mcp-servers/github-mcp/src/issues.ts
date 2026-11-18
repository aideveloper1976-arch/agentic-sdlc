import { githubRequest } from "./github";
import type { GitHubIssue, MCPResponse } from "./types";
import { CreateIssueSchema, UpdateIssueSchema } from "./types";

export async function createIssue(
  title: string,
  description: string,
  labels?: string[]
): Promise<MCPResponse> {
  try {
    const parsed = CreateIssueSchema.parse({ title, description, labels });

    const issue = await githubRequest<GitHubIssue>({
      method: "POST",
      path: "/issues",
      body: {
        title: parsed.title,
        body: parsed.description,
        labels: parsed.labels || [],
      },
    });

    return {
      success: true,
      data: {
        issueNumber: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        labels: issue.labels?.map((l) => l.name) || [],
        createdAt: issue.created_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function updateIssue(
  issueNumber: number,
  fields: {
    title?: string;
    description?: string;
    labels?: string[];
  }
): Promise<MCPResponse> {
  try {
    const parsed = UpdateIssueSchema.parse({
      issueNumber,
      ...fields,
    });

    const body: Record<string, unknown> = {};
    if (parsed.title) body.title = parsed.title;
    if (parsed.description) body.body = parsed.description;
    if (parsed.labels) body.labels = parsed.labels;

    const issue = await githubRequest<GitHubIssue>({
      method: "PATCH",
      path: `/issues/${parsed.issueNumber}`,
      body,
    });

    return {
      success: true,
      data: {
        issueNumber: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        labels: issue.labels?.map((l) => l.name) || [],
        updatedAt: issue.updated_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
