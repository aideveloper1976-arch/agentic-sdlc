# GitHub MCP server

> Repository, branch, commit, pull request, issue and workflow operations for the release phase, including linking PRs back to stories.

| | |
|---|---|
| Package | `@agentic-sdlc/github-mcp` |
| Tools | 16 ([full list](../../docs/tool-catalog.md#github-mcp)) |
| Transport | MCP over stdio |
| Key dependencies | `@modelcontextprotocol/sdk`, `undici`, `zod` |
| Configuration | [`.env.example`](.env.example) |
| Tests | covered by the [MCP smoke test](../../scripts/mcp-smoke.mjs) only; no unit tests yet |

**Run it from the repo root**

```bash
npm ci && npm run build
node mcp-servers/github-mcp/dist/index.js
```

Part of [Agentic SDLC](../../README.md). The rest of this page is the server's detailed reference.

---

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for GitHub that enables AI agents to interact with repositories, manage pull requests, analyse diffs, track work items, and trigger CI/CD workflows.

## Features

- **Repository Operations**: Read repo info, list files, get file contents
- **Branch Management**: Create branches from existing refs
- **File Operations**: Commit multiple file changes atomically
- **Pull Requests**: Create, update, comment, list, and inspect PRs
- **Diff Analysis**: Structured diffs with file-level granularity and human-readable summaries
- **Issue Management**: Create and update issues
- **CI/CD Integration**: Trigger GitHub Actions workflows and query run status
- **Traceability**: Link PRs and commits to Story/Feature IDs
- **PR Quality Checks**: Validates descriptions for Story ID, Feature ID, Summary, and Test Evidence sections

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **HTTP**: [undici](https://github.com/nodejs/undici) (Node.js built-in fetch)
- **Validation**: [zod](https://github.com/colinhacks/zod)
- **Config**: [dotenv](https://github.com/motdotla/dotenv)

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd github-mcp
npm install
npm run build
```

### Environment Variables

Create a `.env` file in `github-mcp/` or set these environment variables:

| Variable        | Description                        | Required |
|-----------------|------------------------------------|----------|
| `GITHUB_TOKEN`  | GitHub Personal Access Token       | Yes      |
| `GITHUB_OWNER`  | GitHub organization or username    | Yes      |
| `GITHUB_REPO`   | Repository name                    | Yes      |

## GitHub Token Setup

1. Go to **GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Set a descriptive name (e.g., `opencode-github-mcp`)
4. Set expiration as needed
5. Under **Repository access**, select **Only select repositories** and choose the target repo(s)
6. Under **Permissions**, grant the following:

### Required Permissions

| Category       | Permission      | Access     | Reason                          |
|----------------|-----------------|------------|----------------------------------|
| Contents       | Read & write    | Repository | Read/write files, create branches |
| Pull requests  | Read & write    | Repository | CRUD pull requests, comments     |
| Issues         | Read & write    | Repository | Create/update issues             |
| Actions        | Read & write    | Repository | Trigger workflows, read status   |
| Metadata       | Read-only       | Repository | Required for all interactions    |

## Usage

### Standalone

```bash
# Set environment variables and start
GITHUB_TOKEN=ghp_xxx GITHUB_OWNER=myorg GITHUB_REPO=myapp npm start
```

### With OpenCode

Add the following to your `opencode.json` or OpenCode configuration:

```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["node", "./github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token",
        "GITHUB_OWNER": "your_org",
        "GITHUB_REPO": "your_repo"
      },
      "enabled": true
    }
  }
}
```

## Tools

### Repository
| Tool             | Description                                      | Inputs                     |
|------------------|--------------------------------------------------|----------------------------|
| `get_repo_info`  | Get repo name, default branch, visibility, etc.  | —                          |
| `list_files`     | List files/dirs at an optional path              | `path` (optional)          |
| `get_file`       | Get file content by path                         | `path` (required)          |

### Branching
| Tool             | Description                                      | Inputs                     |
|------------------|--------------------------------------------------|----------------------------|
| `create_branch`  | Create a new branch from an existing base branch | `branchName`, `baseBranch` |
| `commit_changes` | Commit multiple files atomically                 | `branchName`, `files[]`, `commitMessage`, `storyId` (optional) |

### Diff
| Tool       | Description                                      | Inputs                        |
|------------|--------------------------------------------------|-------------------------------|
| `get_diff` | Structured diff with summary between branches    | `baseBranch`, `compareBranch` |

### Pull Requests
| Tool             | Description                                      | Inputs                                       |
|------------------|--------------------------------------------------|----------------------------------------------|
| `create_pr`      | Create PR with traceability and quality checks   | `title`, `description`, `headBranch`, `baseBranch`, `storyId` (optional), `featureId` (optional) |
| `update_pr`      | Update PR title/description                      | `prNumber`, `title` (optional), `description` (optional) |
| `comment_on_pr`  | Add a comment to a PR                            | `prNumber`, `comment`                        |
| `get_pr`         | Get PR details (status, reviewers, comments, checks) | `prNumber`                               |
| `list_prs`       | List PRs filtered by state                       | `state` (optional, default: `open`)          |
| `link_pr_to_story` | Link a PR to a Story ID (updates body + comment) | `prNumber`, `storyId`                      |

### Issues
| Tool           | Description                                      | Inputs                                   |
|----------------|--------------------------------------------------|------------------------------------------|
| `create_issue` | Create an issue                                  | `title`, `description`, `labels` (optional) |
| `update_issue` | Update issue title/description/labels            | `issueNumber`, optional fields           |

### Workflows
| Tool                  | Description                                      | Inputs                        |
|-----------------------|--------------------------------------------------|-------------------------------|
| `trigger_workflow`    | Trigger a GitHub Actions workflow_dispatch event | `workflowName`, `branch`, `inputs` (optional) |
| `get_workflow_status` | Get workflow run status, conclusion, and logs URL | `workflowRunId`               |

## Output Format

All tool responses follow a consistent structure:

```json
{
  "success": true,
  "data": { ... }
}
```

On error:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

## Agent Usage Rules

Agents using this MCP server should:

1. Create a branch for each feature/task
2. Include a Story ID in every PR
3. Check the diff before requesting a merge
4. Comment on PRs with analysis findings
5. Trigger CI workflows on the branch
6. Wait for test results before merging
7. Link PRs to Stories for traceability

## Security

- **Token security**: The GitHub PAT is never logged. Error messages mask the token.
- **Input validation**: All tool inputs are validated with zod schemas.
- **No destructive operations**: The server does not support repo deletion, branch deletion, or force push.
- **Restricted scope**: Operations are limited to the configured repository.
- **PAT permissions**: Use the principle of least privilege — grant only the permissions listed above.

## Architecture

```
src/
  index.ts      — MCP server entry point, tool registration
  config.ts     — Environment configuration and validation
  github.ts     — GitHub API client (undici-based)
  types.ts      — TypeScript interfaces and zod schemas
  repos.ts      — Repository and branch operations
  prs.ts        — Pull request operations
  issues.ts     — Issue operations
  commits.ts    — Commit message formatting and validation
  workflows.ts  — CI/CD workflow operations
  diff.ts       — Diff generation and summarization
```

## Development

```bash
# Watch mode with auto-reload
npm run dev

# Type-check without emitting
npm run typecheck

# Build
npm run build
```

## License

ISC
