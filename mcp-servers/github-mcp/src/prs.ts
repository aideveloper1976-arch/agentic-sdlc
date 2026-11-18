import { githubRequest } from "./github";
import type {
  GitHubPR,
  GitHubPRComment,
  GitHubCheckRun,
  MCPResponse,
} from "./types";
import {
  CreatePRSchema,
  UpdatePRSchema,
  CommentOnPRSchema,
  GetPRSchema,
  ListPRsSchema,
  LinkPRToStorySchema,
} from "./types";

function validatePRDescription(description: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const requiredSections = [
    { id: "Story ID", pattern: /Story\s*ID|Story:\s*\w+/i },
    { id: "Feature ID", pattern: /Feature\s*ID|Feature:\s*\w+/i },
    { id: "Summary", pattern: /Summary|## Summary/i },
    { id: "Test Evidence", pattern: /Test|Testing|Evidence|QA/i },
  ];

  for (const section of requiredSections) {
    if (!section.pattern.test(description)) {
      warnings.push(`Missing required section: ${section.id}`);
    }
  }

  return { valid: warnings.length === 0, warnings };
}

function buildPRBody(
  description: string,
  storyId?: string,
  featureId?: string
): string {
  const parts: string[] = [];

  if (storyId || featureId) {
    const headerParts: string[] = [];
    if (storyId) headerParts.push(`Story ID: ${storyId}`);
    if (featureId) headerParts.push(`Feature ID: ${featureId}`);
    parts.push(`## Traceability\n\n${headerParts.join(" | ")}`);
    parts.push("---");
  }

  parts.push(description);

  return parts.join("\n\n");
}

export async function createPR(
  title: string,
  description: string,
  headBranch: string,
  baseBranch: string,
  storyId?: string,
  featureId?: string
): Promise<MCPResponse> {
  try {
    const parsed = CreatePRSchema.parse({
      title,
      description,
      headBranch,
      baseBranch,
      storyId,
      featureId,
    });

    const body = buildPRBody(parsed.description, parsed.storyId, parsed.featureId);
    const qualityCheck = validatePRDescription(body);

    const pr = await githubRequest<GitHubPR>({
      method: "POST",
      path: "/pulls",
      body: {
        title: parsed.title,
        body,
        head: parsed.headBranch,
        base: parsed.baseBranch,
      },
    });

    return {
      success: true,
      data: {
        prNumber: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.state,
        qualityCheck,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function updatePR(
  prNumber: number,
  title?: string,
  description?: string
): Promise<MCPResponse> {
  try {
    const parsed = UpdatePRSchema.parse({ prNumber, title, description });

    const body: Record<string, string> = {};
    if (parsed.title) body.title = parsed.title;
    if (parsed.description) body.body = parsed.description;

    const pr = await githubRequest<GitHubPR>({
      method: "PATCH",
      path: `/pulls/${parsed.prNumber}`,
      body,
    });

    return {
      success: true,
      data: {
        prNumber: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function commentOnPR(
  prNumber: number,
  comment: string
): Promise<MCPResponse> {
  try {
    const parsed = CommentOnPRSchema.parse({ prNumber, comment });

    const issueComment = await githubRequest<GitHubPRComment>({
      method: "POST",
      path: `/issues/${parsed.prNumber}/comments`,
      body: { body: parsed.comment },
    });

    return {
      success: true,
      data: {
        id: issueComment.id,
        body: issueComment.body,
        user: issueComment.user.login,
        createdAt: issueComment.created_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function getPR(prNumber: number): Promise<MCPResponse> {
  try {
    const parsed = GetPRSchema.parse({ prNumber });

    const [pr, commentsResponse, checksResponse] = await Promise.all([
      githubRequest<GitHubPR>({ path: `/pulls/${parsed.prNumber}` }),
      githubRequest<GitHubPRComment[]>({
        path: `/issues/${parsed.prNumber}/comments`,
      }).catch(() => []),
      githubRequest<{ check_runs: GitHubCheckRun[] }>({
        path: `/commits/${parsed.prNumber}/check-runs`,
        accept: "application/vnd.github.v3+json",
      }).catch(() => ({ check_runs: [] })),
    ]);

    return {
      success: true,
      data: {
        prNumber: pr.number,
        title: pr.title,
        description: pr.body,
        state: pr.state,
        url: pr.html_url,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        author: pr.user?.login,
        reviewers: pr.requested_reviewers?.map((r) => r.login) || [],
        comments: (commentsResponse || []).map((c) => ({
          id: c.id,
          body: c.body,
          user: c.user.login,
          createdAt: c.created_at,
        })),
        checks: (checksResponse?.check_runs || []).map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          conclusion: c.conclusion,
          url: c.details_url,
        })),
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function listPRs(state?: string): Promise<MCPResponse> {
  try {
    const parsed = ListPRsSchema.parse({ state: state || "open" });

    const prs = await githubRequest<GitHubPR[]>({
      path: "/pulls",
      params: { state: parsed.state, per_page: 20 },
    });

    return {
      success: true,
      data: prs.map((pr) => ({
        prNumber: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        author: pr.user?.login,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function linkPRToStory(
  prNumber: number,
  storyId: string
): Promise<MCPResponse> {
  try {
    const parsed = LinkPRToStorySchema.parse({ prNumber, storyId });

    const pr = await githubRequest<GitHubPR>({
      path: `/pulls/${parsed.prNumber}`,
    });

    const storyLine = `Story ID: ${parsed.storyId}`;
    let newBody = pr.body || "";

    if (newBody.includes("## Traceability")) {
      const traceMatch = newBody.match(/## Traceability\n\n([^#]*)/);
      if (traceMatch) {
        const traceSection = traceMatch[1];
        if (!traceSection.includes(storyLine)) {
          newBody = newBody.replace(
            /## Traceability\n\n/,
            `## Traceability\n\n${storyLine} | `
          );
        }
      }
    } else {
      newBody = `## Traceability\n\n${storyLine}\n\n---\n\n${newBody}`;
    }

    await githubRequest<GitHubPR>({
      method: "PATCH",
      path: `/pulls/${parsed.prNumber}`,
      body: { body: newBody },
    });

    await githubRequest<GitHubPRComment>({
      method: "POST",
      path: `/issues/${parsed.prNumber}/comments`,
      body: {
        body: `🔗 Linked to Story: **${parsed.storyId}**`,
      },
    });

    return {
      success: true,
      data: {
        prNumber: parsed.prNumber,
        storyId: parsed.storyId,
        message: `PR #${parsed.prNumber} linked to story ${parsed.storyId}`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
