import { githubRequest } from "./github";
import type {
  GitHubRepo,
  GitHubContent,
  GitHubRef,
  GitHubBlob,
  GitHubTree,
  GitHubCommit,
  MCPResponse,
} from "./types";
import {
  ListFilesSchema,
  GetFileSchema,
  CreateBranchSchema,
  CommitChangesSchema,
} from "./types";
import { formatCommitMessage } from "./commits";

export async function getRepoInfo(): Promise<MCPResponse> {
  try {
    const repo = await githubRequest<GitHubRepo>({ path: "" });
    return {
      success: true,
      data: {
        name: repo.name,
        defaultBranch: repo.default_branch,
        visibility: repo.private ? "private" : "public",
        updatedAt: repo.updated_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function listFiles(path?: string): Promise<MCPResponse> {
  try {
    const parsed = ListFilesSchema.parse({ path: path ?? "" });
    const contents = await githubRequest<GitHubContent[]>({
      path: `/contents/${parsed.path}`,
    });

    const files = Array.isArray(contents)
      ? contents.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
        }))
      : [];

    return { success: true, data: files };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function getFile(filePath: string): Promise<MCPResponse> {
  try {
    const parsed = GetFileSchema.parse({ path: filePath });
    const content = await githubRequest<GitHubContent>({
      path: `/contents/${parsed.path}`,
    });

    if (content.type !== "file") {
      return { success: false, error: `Path '${parsed.path}' is not a file` };
    }

    const decoded = content.content
      ? Buffer.from(content.content, "base64").toString("utf-8")
      : "";

    return {
      success: true,
      data: {
        name: content.name,
        path: content.path,
        sha: content.sha,
        content: decoded,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function createBranch(
  branchName: string,
  baseBranch?: string
): Promise<MCPResponse> {
  try {
    const parsed = CreateBranchSchema.parse({ branchName, baseBranch });

    const baseRef = await githubRequest<GitHubRef>({
      path: `/git/refs/heads/${parsed.baseBranch}`,
    });

    const sha = baseRef.object.sha;

    const newRef = await githubRequest<GitHubRef>({
      method: "POST",
      path: "/git/refs",
      body: {
        ref: `refs/heads/${parsed.branchName}`,
        sha,
      },
    });

    return {
      success: true,
      data: {
        branch: parsed.branchName,
        ref: newRef.ref,
        sha: newRef.object.sha,
        baseBranch: parsed.baseBranch,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function commitChanges(
  branchName: string,
  files: { path: string; content: string }[],
  commitMessage: string,
  storyId?: string
): Promise<MCPResponse> {
  try {
    const parsed = CommitChangesSchema.parse({
      branchName,
      files,
      commitMessage,
      storyId,
    });

    const branchRef = await githubRequest<GitHubRef>({
      path: `/git/refs/heads/${parsed.branchName}`,
    });

    const baseSha = branchRef.object.sha;

    const currentCommit = await githubRequest<GitHubCommit>({
      path: `/git/commits/${baseSha}`,
    });

    const blobs = await Promise.all(
      parsed.files.map(async (file) => {
        const blob = await githubRequest<GitHubBlob>({
          method: "POST",
          path: "/git/blobs",
          body: {
            content: file.content,
            encoding: "utf-8",
          },
        });
        return {
          path: file.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      })
    );

    const newTree = await githubRequest<GitHubTree>({
      method: "POST",
      path: "/git/trees",
      body: {
        base_tree: currentCommit.tree.sha,
        tree: blobs,
      },
    });

    const message = formatCommitMessage(parsed.commitMessage, parsed.storyId);

    const newCommit = await githubRequest<GitHubCommit>({
      method: "POST",
      path: "/git/commits",
      body: {
        message,
        tree: newTree.sha,
        parents: [baseSha],
      },
    });

    await githubRequest<GitHubRef>({
      method: "PATCH",
      path: `/git/refs/heads/${parsed.branchName}`,
      body: {
        sha: newCommit.sha,
        force: false,
      },
    });

    return {
      success: true,
      data: {
        sha: newCommit.sha,
        commitMessage: message,
        branch: parsed.branchName,
        files: parsed.files.map((f) => f.path),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
