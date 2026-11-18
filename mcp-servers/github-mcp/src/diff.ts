import { githubRequest } from "./github";
import type { MCPResponse } from "./types";
import { GetDiffSchema } from "./types";

interface GitHubCompare {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
  commits: Array<{
    sha: string;
    commit: {
      message: string;
      author: { name: string; date: string };
    };
  }>;
  [key: string]: unknown;
}

function summarizeDiff(files: GitHubCompare["files"]): string {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
  const totalChanges = files.reduce((sum, f) => sum + f.changes, 0);

  const fileSummary = files
    .map(
      (f) =>
        `  ${f.status === "added" ? "+" : f.status === "removed" ? "-" : "~"} ${f.filename} (+${f.additions}/-${f.deletions})`
    )
    .join("\n");

  return [
    `Total: ${totalChanges} changes across ${files.length} files`,
    `Additions: ${totalAdditions}, Deletions: ${totalDeletions}`,
    "",
    "Files changed:",
    fileSummary,
  ].join("\n");
}

export async function getDiff(
  baseBranch: string,
  compareBranch: string
): Promise<MCPResponse> {
  try {
    const parsed = GetDiffSchema.parse({ baseBranch, compareBranch });

    const compare = await githubRequest<GitHubCompare>({
      path: `/compare/${parsed.baseBranch}...${parsed.compareBranch}`,
      accept: "application/vnd.github.v3.diff",
      params: {},
    });

    if (!compare.files) {
      return {
        success: true,
        data: {
          status: compare.status,
          aheadBy: compare.ahead_by,
          behindBy: compare.behind_by,
          totalCommits: compare.total_commits,
          files: [],
          summary: "No differences found between branches",
          commits: compare.commits?.map((c) => ({
            sha: c.sha,
            message: c.commit.message.split("\n")[0],
            author: c.commit.author.name,
            date: c.commit.author.date,
          })),
        },
      };
    }

    const structuredDiff = {
      status: compare.status,
      aheadBy: compare.ahead_by,
      behindBy: compare.behind_by,
      totalCommits: compare.total_commits,
      files: compare.files.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch || null,
      })),
      summary: summarizeDiff(compare.files),
      commits: compare.commits?.map((c) => ({
        sha: c.sha,
        message: c.commit.message.split("\n")[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
      })),
    };

    return { success: true, data: structuredDiff };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
