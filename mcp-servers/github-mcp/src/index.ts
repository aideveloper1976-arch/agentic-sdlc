import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getConfig, maskToken } from "./config";
import { getRepoInfo, listFiles, getFile, createBranch, commitChanges } from "./repos";
import { getDiff } from "./diff";
import {
  createPR,
  updatePR,
  commentOnPR,
  getPR,
  listPRs,
  linkPRToStory,
} from "./prs";
import { createIssue, updateIssue } from "./issues";
import { triggerWorkflow, getWorkflowStatus } from "./workflows";

async function main() {
  try {
    const config = getConfig();
    console.error(`GitHub MCP Server starting...`);
    console.error(`Repository: ${config.githubOwner}/${config.githubRepo}`);
    console.error(`Token: ${maskToken(config.githubToken)}`);
  } catch (error) {
    console.error("Failed to load configuration:", error instanceof Error ? error.message : String(error));
    console.error("Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.");
    process.exit(1);
  }

  const server = new Server(
    {
      name: "github-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_repo_info",
        description: "Get repository information including name, default branch, visibility, and last updated timestamp",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "list_files",
        description: "List files and directories in the repository at an optional path",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Optional path to list contents of (defaults to root)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_file",
        description: "Get the content of a specific file in the repository",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the file (e.g. src/index.ts)",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "create_branch",
        description: "Create a new branch from an existing base branch",
        inputSchema: {
          type: "object",
          properties: {
            branchName: {
              type: "string",
              description: "Name for the new branch",
            },
            baseBranch: {
              type: "string",
              description: "Base branch to fork from (defaults to main)",
            },
          },
          required: ["branchName"],
        },
      },
      {
        name: "commit_changes",
        description: "Commit multiple file changes to a branch. Creates blobs, a tree, and a commit atomically.",
        inputSchema: {
          type: "object",
          properties: {
            branchName: {
              type: "string",
              description: "Branch to commit to",
            },
            files: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  content: { type: "string" },
                },
                required: ["path", "content"],
              },
              description: "Array of files with path and content to commit",
            },
            commitMessage: {
              type: "string",
              description: "Commit message",
            },
            storyId: {
              type: "string",
              description: "Optional Story ID to include in commit message",
            },
          },
          required: ["branchName", "files", "commitMessage"],
        },
      },
      {
        name: "get_diff",
        description: "Get a structured diff between two branches with file-level changes and summary",
        inputSchema: {
          type: "object",
          properties: {
            baseBranch: {
              type: "string",
              description: "Base branch (e.g. main)",
            },
            compareBranch: {
              type: "string",
              description: "Compare branch (e.g. feature/my-feature)",
            },
          },
          required: ["baseBranch", "compareBranch"],
        },
      },
      {
        name: "create_pr",
        description: "Create a pull request with traceability information",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "PR title",
            },
            description: {
              type: "string",
              description: "PR description body",
            },
            headBranch: {
              type: "string",
              description: "Head branch with changes",
            },
            baseBranch: {
              type: "string",
              description: "Base branch to merge into",
            },
            storyId: {
              type: "string",
              description: "Optional Story ID for traceability",
            },
            featureId: {
              type: "string",
              description: "Optional Feature ID for traceability",
            },
          },
          required: ["title", "description", "headBranch", "baseBranch"],
        },
      },
      {
        name: "update_pr",
        description: "Update an existing pull request's title or description",
        inputSchema: {
          type: "object",
          properties: {
            prNumber: {
              type: "number",
              description: "Pull request number",
            },
            title: {
              type: "string",
              description: "New title (optional)",
            },
            description: {
              type: "string",
              description: "New description body (optional)",
            },
          },
          required: ["prNumber"],
        },
      },
      {
        name: "comment_on_pr",
        description: "Add a comment to a pull request",
        inputSchema: {
          type: "object",
          properties: {
            prNumber: {
              type: "number",
              description: "Pull request number",
            },
            comment: {
              type: "string",
              description: "Comment text",
            },
          },
          required: ["prNumber", "comment"],
        },
      },
      {
        name: "get_pr",
        description: "Get detailed information about a pull request including reviewers, comments, and check status",
        inputSchema: {
          type: "object",
          properties: {
            prNumber: {
              type: "number",
              description: "Pull request number",
            },
          },
          required: ["prNumber"],
        },
      },
      {
        name: "list_prs",
        description: "List pull requests filtered by state",
        inputSchema: {
          type: "object",
          properties: {
            state: {
              type: "string",
              enum: ["open", "closed", "all"],
              description: "PR state filter (defaults to open)",
            },
          },
          required: [],
        },
      },
      {
        name: "link_pr_to_story",
        description: "Link a pull request to a story ID for traceability. Updates PR description and adds a comment.",
        inputSchema: {
          type: "object",
          properties: {
            prNumber: {
              type: "number",
              description: "Pull request number",
            },
            storyId: {
              type: "string",
              description: "Story ID to link",
            },
          },
          required: ["prNumber", "storyId"],
        },
      },
      {
        name: "create_issue",
        description: "Create a new issue in the repository",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Issue title",
            },
            description: {
              type: "string",
              description: "Issue description body",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Optional labels to apply",
            },
          },
          required: ["title", "description"],
        },
      },
      {
        name: "update_issue",
        description: "Update an existing issue's title, description, or labels",
        inputSchema: {
          type: "object",
          properties: {
            issueNumber: {
              type: "number",
              description: "Issue number",
            },
            title: {
              type: "string",
              description: "New title (optional)",
            },
            description: {
              type: "string",
              description: "New description body (optional)",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "New labels (optional)",
            },
          },
          required: ["issueNumber"],
        },
      },
      {
        name: "trigger_workflow",
        description: "Trigger a GitHub Actions workflow via workflow_dispatch",
        inputSchema: {
          type: "object",
          properties: {
            workflowName: {
              type: "string",
              description: "Workflow name or filename (e.g. ci.yml)",
            },
            branch: {
              type: "string",
              description: "Branch to run workflow on",
            },
            inputs: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Optional workflow dispatch inputs",
            },
          },
          required: ["workflowName", "branch"],
        },
      },
      {
        name: "get_workflow_status",
        description: "Get the status and conclusion of a workflow run",
        inputSchema: {
          type: "object",
          properties: {
            workflowRunId: {
              type: "number",
              description: "Workflow run ID",
            },
          },
          required: ["workflowRunId"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_repo_info": {
          return { content: [{ type: "text", text: JSON.stringify(await getRepoInfo()) }] };
        }

        case "list_files": {
          const path = args?.path as string | undefined;
          return { content: [{ type: "text", text: JSON.stringify(await listFiles(path)) }] };
        }

        case "get_file": {
          const filePath = args?.path as string;
          if (!filePath) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "path is required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await getFile(filePath)) }] };
        }

        case "create_branch": {
          const branchName = args?.branchName as string;
          const baseBranch = args?.baseBranch as string | undefined;
          if (!branchName) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "branchName is required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await createBranch(branchName, baseBranch)) }] };
        }

        case "commit_changes": {
          const { branchName, files, commitMessage, storyId } = args as {
            branchName: string;
            files: { path: string; content: string }[];
            commitMessage: string;
            storyId?: string;
          };
          if (!branchName || !files || !commitMessage) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "branchName, files, and commitMessage are required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await commitChanges(branchName, files, commitMessage, storyId)) }] };
        }

        case "get_diff": {
          const { baseBranch, compareBranch } = args as { baseBranch: string; compareBranch: string };
          if (!baseBranch || !compareBranch) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "baseBranch and compareBranch are required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await getDiff(baseBranch, compareBranch)) }] };
        }

        case "create_pr": {
          const { title, description, headBranch, baseBranch, storyId, featureId } = args as {
            title: string;
            description: string;
            headBranch: string;
            baseBranch: string;
            storyId?: string;
            featureId?: string;
          };
          if (!title || !description || !headBranch || !baseBranch) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "title, description, headBranch, and baseBranch are required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await createPR(title, description, headBranch, baseBranch, storyId, featureId)) }] };
        }

        case "update_pr": {
          const { prNumber, title, description } = args as { prNumber: number; title?: string; description?: string };
          if (!prNumber) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "prNumber is required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await updatePR(prNumber, title, description)) }] };
        }

        case "comment_on_pr": {
          const { prNumber: commentPRNumber, comment } = args as { prNumber: number; comment: string };
          if (!commentPRNumber || !comment) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "prNumber and comment are required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await commentOnPR(commentPRNumber, comment)) }] };
        }

        case "get_pr": {
          const getPRNumber = args?.prNumber as number;
          if (!getPRNumber) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "prNumber is required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await getPR(getPRNumber)) }] };
        }

        case "list_prs": {
          const state = args?.state as string | undefined;
          return { content: [{ type: "text", text: JSON.stringify(await listPRs(state)) }] };
        }

        case "link_pr_to_story": {
          const { prNumber: linkPRNumber, storyId: linkStoryId } = args as { prNumber: number; storyId: string };
          if (!linkPRNumber || !linkStoryId) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "prNumber and storyId are required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await linkPRToStory(linkPRNumber, linkStoryId)) }] };
        }

        case "create_issue": {
          const { title: issueTitle, description: issueDescription, labels } = args as {
            title: string;
            description: string;
            labels?: string[];
          };
          if (!issueTitle || !issueDescription) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "title and description are required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await createIssue(issueTitle, issueDescription, labels)) }] };
        }

        case "update_issue": {
          const { issueNumber, title: updateIssueTitle, description: updateIssueDescription, labels: updateIssueLabels } = args as {
            issueNumber: number;
            title?: string;
            description?: string;
            labels?: string[];
          };
          if (!issueNumber) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "issueNumber is required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await updateIssue(issueNumber, { title: updateIssueTitle, description: updateIssueDescription, labels: updateIssueLabels })) }] };
        }

        case "trigger_workflow": {
          const { workflowName, branch: workflowBranch, inputs } = args as {
            workflowName: string;
            branch: string;
            inputs?: Record<string, string>;
          };
          if (!workflowName || !workflowBranch) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "workflowName and branch are required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await triggerWorkflow(workflowName, workflowBranch, inputs)) }] };
        }

        case "get_workflow_status": {
          const runId = args?.workflowRunId as number;
          if (!runId) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "workflowRunId is required" }) }] };
          }
          return { content: [{ type: "text", text: JSON.stringify(await getWorkflowStatus(runId)) }] };
        }

        default:
          return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) }],
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: message }) }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
