import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import * as fs from "fs";
import FormData from "form-data";

// Match the names in mcp_config.json
const { ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN } = process.env;

if (!ATLASSIAN_BASE_URL || !ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    process.exit(1);
}

const jiraApi = axios.create({
    baseURL: ATLASSIAN_BASE_URL,
    headers: {
        Authorization: `Basic ${Buffer.from(
            `${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`
        ).toString("base64")}`,
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

// Confluence API uses the same base URL but different paths (/wiki/rest/api)
const confluenceApi = axios.create({
    baseURL: ATLASSIAN_BASE_URL.replace(/\/$/, "") + "/wiki",
    headers: {
        Authorization: `Basic ${Buffer.from(
            `${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`
        ).toString("base64")}`,
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

const server = new Server(
    {
        name: "atlassian-custom-mcp",
        version: "1.2.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            // --- JIRA TOOLS ---
            {
                name: "list_transitions",
                description: "Get a list of available transitions for a Jira issue. (Custom)",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "The key of the Jira issue (e.g., MOE-1)." },
                    },
                    required: ["issueKey"],
                },
            },
            {
                name: "transition_issue",
                description: "Transition a Jira issue to a new status. (Custom)",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "The key of the Jira issue." },
                        transitionId: { type: "string", description: "The ID of the transition to perform." },
                    },
                    required: ["issueKey", "transitionId"],
                },
            },
            {
                name: "update_issue_field",
                description: "Update a field on a Jira issue. (Custom)",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "The key of the Jira issue." },
                        fields: { type: "object", description: "The fields to update (e.g., { summary: 'New Summary' })." },
                    },
                    required: ["issueKey", "fields"],
                },
            },
            {
                name: "get_jira_issue",
                description: "Get detailed information about a Jira issue. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "The key of the Jira issue." },
                    },
                    required: ["issueKey"],
                },
            },
            {
                name: "search_jira_issues",
                description: "Search for Jira issues using JQL. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        jql: { type: "string", description: "The JQL query string." },
                        maxResults: { type: "number", description: "Maximum number of results to return (default 50)." },
                    },
                    required: ["jql"],
                },
            },
            {
                name: "add_jira_comment",
                description: "Add a comment to a Jira issue. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "The key of the Jira issue." },
                        body: { type: "string", description: "The text of the comment." },
                    },
                    required: ["issueKey", "body"],
                },
            },
            {
                name: "create_jira_issue",
                description: "Create a new Jira issue. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectKey: { type: "string", description: "The project key." },
                        summary: { type: "string", description: "The summary of the issue." },
                        description: { type: "string", description: "The description of the issue." },
                        issueType: { type: "string", description: "The issue type (e.g., Task, Bug)." },
                    },
                    required: ["projectKey", "summary", "issueType"],
                },
            },
            {
                name: "list_jira_projects",
                description: "List all Jira projects. (Parity)",
                inputSchema: { type: "object", properties: {} },
            },
            // --- CONFLUENCE TOOLS ---
            {
                name: "list_confluence_spaces",
                description: "List all Confluence spaces. (Parity)",
                inputSchema: { type: "object", properties: {} },
            },
            {
                name: "search_confluence_pages",
                description: "Search for Confluence pages using CQL. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        cql: { type: "string", description: "The CQL query string (e.g., 'space = DEV AND title ~ \"Home\"')." },
                        limit: { type: "number", description: "Maximum number of results to return (default 25)." },
                    },
                    required: ["cql"],
                },
            },
            {
                name: "read_confluence_page",
                description: "Read the content of a Confluence page. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        pageId: { type: "string", description: "The ID of the Confluence page." },
                    },
                    required: ["pageId"],
                },
            },
            {
                name: "create_confluence_page",
                description: "Create a new Confluence page. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        spaceKey: { type: "string", description: "The key of the space." },
                        title: { type: "string", description: "The title of the page." },
                        content: { type: "string", description: "The content of the page (Storage format / HTML)." },
                        parentId: { type: "string", description: "The ID of the parent page (optional)." },
                    },
                    required: ["spaceKey", "title", "content"],
                },
            },
            {
                name: "add_confluence_comment",
                description: "Add a comment to a Confluence page. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        pageId: { type: "string", description: "The ID of the page." },
                        body: { type: "string", description: "The text of the comment." },
                    },
                    required: ["pageId", "body"],
                },
            },
            {
                name: "update_confluence_page",
                description: "Update an existing Confluence page. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        pageId: { type: "string", description: "The ID of the page." },
                        title: { type: "string", description: "The new title of the page." },
                        content: { type: "string", description: "The new content of the page (Storage format / HTML)." },
                        version: { type: "number", description: "The new version number of the page (usually current version + 1)." },
                    },
                    required: ["pageId", "title", "content", "version"],
                },
            },
            {
                name: "upload_confluence_attachment",
                description: "Upload an attachment to a Confluence page. (Parity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        pageId: { type: "string", description: "The ID of the page." },
                        filePath: { type: "string", description: "The absolute path to the file to upload." },
                        fileName: { type: "string", description: "The name of the file as it should appear in Confluence." },
                        comment: { type: "string", description: "Optional comment for the attachment." },
                    },
                    required: ["pageId", "filePath", "fileName"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            // --- JIRA HANDLERS ---
            case "list_transitions": {
                const { issueKey } = args as { issueKey: string };
                const response = await jiraApi.get(`/rest/api/3/issue/${issueKey}/transitions`) as any;
                return { content: [{ type: "text", text: JSON.stringify(response.data.transitions, null, 2) }] };
            }

            case "transition_issue": {
                const { issueKey, transitionId } = args as { issueKey: string, transitionId: string };
                await jiraApi.post(`/rest/api/3/issue/${issueKey}/transitions`, { transition: { id: transitionId } });
                return { content: [{ type: "text", text: `Issue ${issueKey} transitioned successfully.` }] };
            }

            case "update_issue_field": {
                const { issueKey, fields } = args as { issueKey: string, fields: any };
                await jiraApi.put(`/rest/api/3/issue/${issueKey}`, { fields });
                return { content: [{ type: "text", text: `Issue ${issueKey} updated successfully.` }] };
            }

            case "get_jira_issue": {
                const { issueKey } = args as { issueKey: string };
                const response = await jiraApi.get(`/rest/api/3/issue/${issueKey}`) as any;
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }

            case "search_jira_issues": {
                const { jql, maxResults = 50 } = args as { jql: string, maxResults?: number };
                const response = await jiraApi.post("/rest/api/3/search/jql", { jql, maxResults }) as any;
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }

            case "add_jira_comment": {
                const { issueKey, body } = args as { issueKey: string, body: string };
                await jiraApi.post(`/rest/api/3/issue/${issueKey}/comment`, { body: { version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: body }] }] } });
                return { content: [{ type: "text", text: `Comment added to ${issueKey}.` }] };
            }

            case "create_jira_issue": {
                const { projectKey, summary, description, issueType } = args as { projectKey: string, summary: string, description?: string, issueType: string };
                const response = await jiraApi.post(`/rest/api/3/issue`, {
                    fields: {
                        project: { key: projectKey },
                        summary,
                        description: description ? { version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] } : undefined,
                        issuetype: { name: issueType },
                    },
                }) as any;
                return { content: [{ type: "text", text: `Issue created: ${response.data.key}` }] };
            }

            case "list_jira_projects": {
                const response = await jiraApi.get(`/rest/api/3/project`) as any;
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }

            // --- CONFLUENCE HANDLERS ---
            case "list_confluence_spaces": {
                const response = await confluenceApi.get(`/rest/api/space`) as any;
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }

            case "search_confluence_pages": {
                const { cql, limit = 25 } = args as { cql: string, limit?: number };
                const response = await confluenceApi.get(`/rest/api/content/search`, { params: { cql, limit } }) as any;
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }

            case "read_confluence_page": {
                const { pageId } = args as { pageId: string };
                const response = await confluenceApi.get(`/rest/api/content/${pageId}`, { params: { expand: "body.storage,version" } }) as any;
                return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
            }

            case "create_confluence_page": {
                const { spaceKey, title, content, parentId } = args as { spaceKey: string, title: string, content: string, parentId?: string };
                const response = await confluenceApi.post(`/rest/api/content`, {
                    type: "page",
                    title,
                    space: { key: spaceKey },
                    body: { storage: { value: content, representation: "storage" } },
                    ancestors: parentId ? [{ id: parentId }] : undefined,
                }) as any;
                return { content: [{ type: "text", text: `Page created: ${response.data.id}` }] };
            }

            case "add_confluence_comment": {
                const { pageId, body } = args as { pageId: string, body: string };
                await confluenceApi.post(`/rest/api/content/${pageId}/child/comment`, {
                    type: "comment",
                    body: { storage: { value: body, representation: "storage" } },
                });
                return { content: [{ type: "text", text: `Comment added to page ${pageId}.` }] };
            }

            case "update_confluence_page": {
                const { pageId, title, content, version } = args as { pageId: string, title: string, content: string, version: number };
                await confluenceApi.put(`/rest/api/content/${pageId}`, {
                    type: "page",
                    title,
                    version: { number: version },
                    body: { storage: { value: content, representation: "storage" } },
                });
                return { content: [{ type: "text", text: `Page ${pageId} updated successfully to version ${version}.` }] };
            }

            case "upload_confluence_attachment": {
                const { pageId, filePath, fileName, comment } = args as { pageId: string, filePath: string, fileName: string, comment?: string };
                const formData = new FormData();
                formData.append("file", fs.createReadStream(filePath), { filename: fileName });
                if (comment) formData.append("comment", comment);

                await confluenceApi.post(`/rest/api/content/${pageId}/child/attachment`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        "X-Atlassian-Token": "nocheck",
                        "Accept": "application/json",
                    },
                });
                return { content: [{ type: "text", text: `File ${fileName} attached to page ${pageId} successfully.` }] };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error: any) {
        const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        return { content: [{ type: "text", text: `Error: ${errorMessage}` }], isError: true };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    // Log to stderr only
    process.stderr.write(`Server error: ${error}\n`);
    process.exit(1);
});
