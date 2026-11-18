import { githubRequest } from "./github";
import type { GitHubWorkflowRun, MCPResponse } from "./types";
import { TriggerWorkflowSchema, GetWorkflowStatusSchema } from "./types";

interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  [key: string]: unknown;
}

export async function triggerWorkflow(
  workflowName: string,
  branch: string,
  inputs?: Record<string, string>
): Promise<MCPResponse> {
  try {
    const parsed = TriggerWorkflowSchema.parse({
      workflowName,
      branch,
      inputs,
    });

    const workflows = await githubRequest<{ workflows: GitHubWorkflow[] }>({
      path: "/actions/workflows",
      params: { per_page: 50 },
    });

    const workflow = workflows.workflows.find(
      (w) => w.name === parsed.workflowName || w.path.endsWith(parsed.workflowName)
    );

    if (!workflow) {
      const available = workflows.workflows.map((w) => w.name).join(", ");
      return {
        success: false,
        error: `Workflow '${parsed.workflowName}' not found. Available workflows: ${available}`,
      };
    }

    await githubRequest<Record<string, unknown>>({
      method: "POST",
      path: `/actions/workflows/${workflow.id}/dispatches`,
      body: {
        ref: parsed.branch,
        inputs: parsed.inputs || {},
      },
    });

    return {
      success: true,
      data: {
        workflowName: workflow.name,
        workflowId: workflow.id,
        branch: parsed.branch,
        message: `Workflow '${workflow.name}' triggered on branch '${parsed.branch}'`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

export async function getWorkflowStatus(
  workflowRunId: number
): Promise<MCPResponse> {
  try {
    const parsed = GetWorkflowStatusSchema.parse({ workflowRunId });

    const run = await githubRequest<GitHubWorkflowRun>({
      path: `/actions/runs/${parsed.workflowRunId}`,
    });

    return {
      success: true,
      data: {
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        logsUrl: run.logs_url || null,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
