#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { config, ensureDirectories } from "./config.js";
import { searchSearxng } from "./searxng.js";
import { extractPage, searchBrowser } from "./browser.js";
import { saveEvidence } from "./evidence.js";
import type { McpToolResponse } from "./types.js";

ensureDirectories();

const server = new Server(
  { name: "browser-research-mcp", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

const SearchWebSchema = z.object({
  query: z.string().min(1).describe("Search query"),
  maxResults: z.number().min(1).max(50).default(10).describe("Maximum results to return"),
  engine: z.enum(["searxng", "browser"]).default("searxng").describe("Search engine to use"),
});

const ExtractPageSchema = z.object({
  url: z.string().url().describe("URL of the page to extract"),
  maxChars: z.number().min(1000).max(100000).default(15000).describe("Maximum characters to extract"),
  screenshot: z.boolean().default(false).describe("Capture a screenshot of the page"),
});

const SaveEvidenceSchema = z.object({
  topic: z.string().min(1).describe("Research topic or category"),
  sourceUrl: z.string().url().describe("URL the evidence was extracted from"),
  title: z.string().optional().describe("Page title"),
  summary: z.string().min(1).describe("Summary of the evidence"),
  extractedText: z.string().optional().describe("Full extracted text content"),
  tags: z.array(z.string()).optional().describe("Tags for categorization"),
});

const CompetitorScanSchema = z.object({
  productIdea: z.string().min(1).describe("Product idea to find competitors for"),
  market: z.string().optional().describe("Specific market segment"),
  maxResults: z.number().min(1).max(20).default(8).describe("Maximum competitor candidates"),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_web",
      description: "Search the web using SearXNG or browser-based search. Returns title, url, snippet. Use SearXNG first — it is local and fast. Search snippets are NOT final evidence; agents must call extract_page before making source-backed claims.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          maxResults: { type: "number", default: 10, description: "Maximum results (1-50)" },
          engine: { type: "string", enum: ["searxng", "browser"], default: "searxng", description: "Search engine" },
        },
        required: ["query"],
      },
    },
    {
      name: "extract_page",
      description: "Open a public URL with Playwright Chromium, extract readable text, and optionally save a screenshot. Removes nav, footer, scripts, styles. Use this before making any source-backed claim.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to extract" },
          maxChars: { type: "number", default: 15000, description: "Max characters to extract" },
          screenshot: { type: "boolean", default: false, description: "Save screenshot?" },
        },
        required: ["url"],
      },
    },
    {
      name: "save_evidence",
      description: "Save extracted evidence to disk as both JSON and Markdown files. Use after extract_page to preserve findings for later reference.",
      inputSchema: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Research topic" },
          sourceUrl: { type: "string", description: "Source URL" },
          title: { type: "string", description: "Page title" },
          summary: { type: "string", description: "Evidence summary" },
          extractedText: { type: "string", description: "Full extracted text" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
        },
        required: ["topic", "sourceUrl", "summary"],
      },
    },
    {
      name: "competitor_scan",
      description: "Scan for competitors related to a product idea. Returns candidate sources — agents must call extract_page before using findings as evidence. Does not invent competitor features.",
      inputSchema: {
        type: "object",
        properties: {
          productIdea: { type: "string", description: "Product idea" },
          market: { type: "string", description: "Market segment" },
          maxResults: { type: "number", default: 8, description: "Max candidates" },
        },
        required: ["productIdea"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_web": {
        const parsed = SearchWebSchema.parse(args);
        const results = parsed.engine === "browser"
          ? await searchBrowser(parsed.query, parsed.maxResults)
          : await searchSearxng(parsed.query, parsed.maxResults);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: parsed.query,
                  count: results.length,
                  results,
                  warning: "Search snippets are not final evidence. Call extract_page to verify before making source-backed claims.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "extract_page": {
        const parsed = ExtractPageSchema.parse(args);
        const page = await extractPage(parsed.url, parsed.maxChars, parsed.screenshot);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  title: page.title,
                  url: page.url,
                  finalUrl: page.finalUrl,
                  extractedAt: page.extractedAt,
                  charCount: page.text.length,
                  text: page.text,
                  screenshotPath: page.screenshotPath || null,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "save_evidence": {
        const parsed = SaveEvidenceSchema.parse(args);
        const record = saveEvidence({
          topic: parsed.topic,
          sourceUrl: parsed.sourceUrl,
          title: parsed.title,
          summary: parsed.summary,
          extractedText: parsed.extractedText,
          tags: parsed.tags,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: record.id,
                  topic: record.topic,
                  filePaths: record.filePaths,
                  createdAt: record.createdAt,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "competitor_scan": {
        const parsed = CompetitorScanSchema.parse(args);
        const queryParts = [parsed.productIdea];
        if (parsed.market) queryParts.push(parsed.market);
        queryParts.push("competitors alternatives");
        const query = queryParts.join(" ");

        const results = await searchSearxng(query, parsed.maxResults);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  productIdea: parsed.productIdea,
                  market: parsed.market || null,
                  candidates: results,
                  count: results.length,
                  note: "These are candidate sources only. Call extract_page on individual URLs before using them as evidence.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Browser Research MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
