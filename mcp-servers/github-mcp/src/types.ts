import { z } from "zod";

export const GitHubConfigSchema = z.object({
  githubToken: z.string().min(1, "GITHUB_TOKEN is required"),
  githubOwner: z.string().min(1, "GITHUB_OWNER is required"),
  githubRepo: z.string().min(1, "GITHUB_REPO is required"),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

export const FileInputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const CreateBranchSchema = z.object({
  branchName: z.string().min(1).regex(/^[a-zA-Z0-9_\-\/\.]+$/, "Invalid branch name"),
  baseBranch: z.string().optional().default("main"),
});

export const CommitChangesSchema = z.object({
  branchName: z.string().min(1),
  files: z.array(FileInputSchema).min(1),
  commitMessage: z.string().min(1),
  storyId: z.string().optional(),
});

export const GetDiffSchema = z.object({
  baseBranch: z.string().min(1),
  compareBranch: z.string().min(1),
});

export const CreatePRSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1),
  headBranch: z.string().min(1),
  baseBranch: z.string().min(1),
  storyId: z.string().optional(),
  featureId: z.string().optional(),
});

export const UpdatePRSchema = z.object({
  prNumber: z.number().int().positive(),
  title: z.string().min(1).max(256).optional(),
  description: z.string().optional(),
});

export const CommentOnPRSchema = z.object({
  prNumber: z.number().int().positive(),
  comment: z.string().min(1),
});

export const GetPRSchema = z.object({
  prNumber: z.number().int().positive(),
});

export const ListPRsSchema = z.object({
  state: z.enum(["open", "closed", "all"]).optional().default("open"),
});

export const LinkPRToStorySchema = z.object({
  prNumber: z.number().int().positive(),
  storyId: z.string().min(1),
});

export const CreateIssueSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1),
  labels: z.array(z.string()).optional(),
});

export const UpdateIssueSchema = z.object({
  issueNumber: z.number().int().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export const TriggerWorkflowSchema = z.object({
  workflowName: z.string().min(1),
  branch: z.string().min(1),
  inputs: z.record(z.string(), z.string()).optional(),
});

export const GetWorkflowStatusSchema = z.object({
  workflowRunId: z.number().int().positive(),
});

export const ListFilesSchema = z.object({
  path: z.string().optional().default(""),
});

export const GetFileSchema = z.object({
  path: z.string().min(1),
});

export interface MCPSuccessResponse {
  success: true;
  data: unknown;
}

export interface MCPErrorResponse {
  success: false;
  error: string;
}

export type MCPResponse = MCPSuccessResponse | MCPErrorResponse;

export interface GitHubUser {
  login: string;
  id: number;
  [key: string]: unknown;
}

export interface GitHubRepo {
  name: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
  [key: string]: unknown;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  content?: string;
  sha: string;
  [key: string]: unknown;
}

export interface GitHubRef {
  ref: string;
  node_id: string;
  object: {
    sha: string;
    type: string;
    url: string;
  };
  [key: string]: unknown;
}

export interface GitHubBlob {
  sha: string;
  url: string;
  [key: string]: unknown;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
    url: string;
  }>;
  [key: string]: unknown;
}

export interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    tree: { sha: string; url: string };
    [key: string]: unknown;
  };
  tree: { sha: string; url: string };
  [key: string]: unknown;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: { login: string };
  requested_reviewers: Array<{ login: string }>;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface GitHubPRComment {
  id: number;
  body: string;
  user: { login: string };
  created_at: string;
  [key: string]: unknown;
}

export interface GitHubCheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  details_url: string;
  [key: string]: unknown;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: Array<{ name: string }>;
  html_url: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  logs_url: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}
