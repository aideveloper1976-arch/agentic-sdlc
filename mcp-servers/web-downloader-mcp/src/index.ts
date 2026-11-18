#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { config } from "./config.js";
import {
  downloadWebContent,
  fetchWebPageInfo,
  fetchAndExtractHtml,
} from "./downloader.js";
import type { DownloadResult, HtmlExtractResult } from "./types.js";

const server = new Server(
  {
    name: "web-downloader-mcp",
    version: "0.1.0",
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
      {
        name: "download_web_content",
        description:
          "Download content from any web URL. Supports text, HTML, JSON, images, PDFs, and other file types. Saves to local filesystem with safety controls.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to download from",
            },
            targetPath: {
              type: "string",
              description: "Directory to save the file (defaults to config DOWNLOAD_DIR)",
            },
            fileName: {
              type: "string",
              description: "Custom file name (auto-detected from URL if not set)",
            },
            format: {
              type: "string",
              enum: ["auto", "text", "binary", "html", "json"],
              description: "Hint for content type handling",
              default: "auto",
            },
            headers: {
              type: "object",
              description: "Additional HTTP headers",
              additionalProperties: { type: "string" },
            },
          },
          required: ["url"],
        },
      },
      {
        name: "fetch_web_page_info",
        description:
          "Get metadata about a web page without downloading full content. Uses HTTP HEAD request to check status, content type, and size.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to inspect",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "fetch_and_extract_html",
        description:
          "Download an HTML page and extract its title, text content, links, images, and meta tags. Safer than full download for research purposes.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL of the HTML page to fetch and extract",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "get_downloader_info",
        description:
          "Show current downloader configuration: allowed domains, max file size, timeout, blocked extensions, download directory.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "download_web_content": {
        const schema = z.object({
          url: z.string().url(),
          targetPath: z.string().optional(),
          fileName: z.string().optional(),
          format: z
            .enum(["auto", "text", "binary", "html", "json"])
            .optional()
            .default("auto"),
          headers: z.record(z.string()).optional(),
        });

        const params = schema.parse(args);
        const result: DownloadResult = await downloadWebContent(params);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "fetch_web_page_info": {
        const schema = z.object({
          url: z.string().url(),
        });

        const params = schema.parse(args);
        const info = await fetchWebPageInfo(params.url);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  url: info.url,
                  statusCode: info.statusCode,
                  mimeType: info.mimeType,
                  contentLength: info.contentLength,
                  headers: info.headers,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "fetch_and_extract_html": {
        const schema = z.object({
          url: z.string().url(),
        });

        const params = schema.parse(args);
        const result: HtmlExtractResult = await fetchAndExtractHtml(params);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  url: result.url,
                  title: result.title,
                  statusCode: result.statusCode,
                  textContent: result.textContent,
                  links: result.links,
                  images: result.images,
                  meta: result.meta,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_downloader_info": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  allowedDomains: config.allowedDomains.includes("*")
                    ? ["* (any)"]
                    : config.allowedDomains,
                  maxFileSizeBytes: config.maxFileSize,
                  maxFileSizeHuman: humanFileSize(config.maxFileSize),
                  downloadTimeoutMs: config.downloadTimeoutMs,
                  blockedExtensions: config.blockedExtensions,
                  downloadDirectory: config.downloadDir,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${err.errors.map((e) => e.message).join(", ")}`
      );
    }
    if (err instanceof McpError) throw err;
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${(err as Error).message}`
    );
  }
});

function humanFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Web Downloader MCP server running`);
  console.error(`  Download dir: ${config.downloadDir}`);
  console.error(`  Max file size: ${humanFileSize(config.maxFileSize)}`);
  console.error(`  Allowed domains: ${config.allowedDomains.includes("*") ? "any" : config.allowedDomains.join(", ")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
