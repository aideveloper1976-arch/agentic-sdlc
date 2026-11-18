#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { config } from "./config.js";
import { getDb, initDb } from "./db.js";
import { syncFromJira, syncToJira, syncFromConfluence, syncAll } from "./sync.js";
import { getEntity, getLinks, getEvidence, getTrace, searchTraceEntities } from "./traceability.js";
import { generateMarkdownReport, generateHtmlContent } from "./markdown.js";
import type { EntityType, LinkType, TraceEntity, TraceEvidence } from "./types.js";

initDb();

const server = new Server(
  { name: "traceability-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const RecordEntitySchema = z.object({
  type: z.enum([
    "idea", "research", "epic", "feature", "story", "code_change",
    "test_result", "ux_review", "security_review", "release", "decision", "risk", "dependency",
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  externalSystem: z.string().optional(),
  externalId: z.string().optional(),
  externalUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const LinkEntitiesSchema = z.object({
  fromEntityId: z.string().min(1),
  toEntityId: z.string().min(1),
  linkType: z.enum([
    "derived_from", "decomposes_to", "implemented_by", "validated_by",
    "reviewed_by", "secured_by", "released_in", "depends_on", "mitigates", "documents", "relates_to",
  ]),
  rationale: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const AddEvidenceSchema = z.object({
  entityId: z.string().min(1),
  evidenceType: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().optional(),
  filePath: z.string().optional(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const GetTraceSchema = z.object({
  entityId: z.string().min(1),
  depth: z.number().min(1).max(10).default(3),
  direction: z.enum(["upstream", "downstream", "both"]).default("both"),
});

const GenerateTraceReportSchema = z.object({
  entityId: z.string().min(1),
  format: z.enum(["markdown", "json"]).default("markdown"),
  includeEvidence: z.boolean().default(true),
});

const SyncFromJiraSchema = z.object({
  jql: z.string().optional(),
  projectKey: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(50),
});

const SyncToJiraSchema = z.object({
  entityId: z.string().min(1),
  createIfMissing: z.boolean().default(false),
});

const SyncFromConfluenceSchema = z.object({
  spaceKey: z.string().optional(),
  cql: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(25),
});

const PublishTraceReportSchema = z.object({
  entityId: z.string().min(1),
  parentPageId: z.string().optional(),
  title: z.string().optional(),
  includeEvidence: z.boolean().default(true),
});

const SearchTraceSchema = z.object({
  query: z.string().min(1),
  types: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
});

const SyncAllSchema = z.object({
  jira: z.boolean().default(true),
  confluence: z.boolean().default(true),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "record_entity",
      description: "Create or update a local trace entity. If externalSystem + externalId are provided, upserts by external reference.",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["idea", "research", "epic", "feature", "story", "code_change", "test_result", "ux_review", "security_review", "release", "decision", "risk", "dependency"] },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string" },
          externalSystem: { type: "string" },
          externalId: { type: "string" },
          externalUrl: { type: "string" },
          metadata: { type: "object" },
        },
        required: ["type", "title"],
      },
    },
    {
      name: "link_entities",
      description: "Create a trace link between two entities. Prevents duplicate identical links.",
      inputSchema: {
        type: "object",
        properties: {
          fromEntityId: { type: "string" },
          toEntityId: { type: "string" },
          linkType: { type: "string", enum: ["derived_from", "decomposes_to", "implemented_by", "validated_by", "reviewed_by", "secured_by", "released_in", "depends_on", "mitigates", "documents", "relates_to"] },
          rationale: { type: "string" },
          metadata: { type: "object" },
        },
        required: ["fromEntityId", "toEntityId", "linkType"],
      },
    },
    {
      name: "add_evidence",
      description: "Add an evidence record against a trace entity.",
      inputSchema: {
        type: "object",
        properties: {
          entityId: { type: "string" },
          evidenceType: { type: "string" },
          title: { type: "string" },
          sourceUrl: { type: "string" },
          filePath: { type: "string" },
          summary: { type: "string" },
          metadata: { type: "object" },
        },
        required: ["entityId", "evidenceType", "title"],
      },
    },
    {
      name: "get_trace",
      description: "Return entity, linked entities, links, evidence, and gap analysis for an entity. Supports upstream/downstream tracing.",
      inputSchema: {
        type: "object",
        properties: {
          entityId: { type: "string" },
          depth: { type: "number", default: 3 },
          direction: { type: "string", enum: ["upstream", "downstream", "both"], default: "both" },
        },
        required: ["entityId"],
      },
    },
    {
      name: "generate_trace_report",
      description: "Generate an audit-ready traceability report as markdown or JSON. Saved to TRACEABILITY_REPORT_DIR.",
      inputSchema: {
        type: "object",
        properties: {
          entityId: { type: "string" },
          format: { type: "string", enum: ["markdown", "json"], default: "markdown" },
          includeEvidence: { type: "boolean", default: true },
        },
        required: ["entityId"],
      },
    },
    {
      name: "sync_from_jira",
      description: "Pull Jira issues into local cache. Maps Epic → epic, Story → story, Task → story, Bug → risk. Creates trace links for parent/child relationships.",
      inputSchema: {
        type: "object",
        properties: {
          jql: { type: "string" },
          projectKey: { type: "string" },
          maxResults: { type: "number", default: 50 },
        },
      },
    },
    {
      name: "sync_to_jira",
      description: "Push local entity updates to Jira. By default updates existing issues only. Set createIfMissing=true to create new Jira issues.",
      inputSchema: {
        type: "object",
        properties: {
          entityId: { type: "string" },
          createIfMissing: { type: "boolean", default: false },
        },
        required: ["entityId"],
      },
    },
    {
      name: "sync_from_confluence",
      description: "Pull Confluence pages into local cache as research/decision entities.",
      inputSchema: {
        type: "object",
        properties: {
          spaceKey: { type: "string" },
          cql: { type: "string" },
          maxResults: { type: "number", default: 25 },
        },
      },
    },
    {
      name: "publish_trace_report_to_confluence",
      description: "Generate a trace report and publish/update it as a Confluence page. Only updates pages created by this MCP unless parentPageId is specified.",
      inputSchema: {
        type: "object",
        properties: {
          entityId: { type: "string" },
          parentPageId: { type: "string" },
          title: { type: "string" },
          includeEvidence: { type: "boolean", default: true },
        },
        required: ["entityId"],
      },
    },
    {
      name: "search_trace",
      description: "Search local cache by title, description, external ID, or URL.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          types: { type: "array", items: { type: "string" } },
          limit: { type: "number", default: 20 },
        },
        required: ["query"],
      },
    },
    {
      name: "sync_all",
      description: "Run full Jira and Confluence sync. Writes sync_log records. Returns summary.",
      inputSchema: {
        type: "object",
        properties: {
          jira: { type: "boolean", default: true },
          confluence: { type: "boolean", default: true },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "record_entity": {
        const parsed = RecordEntitySchema.parse(args);
        const db = getDb();
        const now = new Date().toISOString();
        const id = uuid();

        let existingId: string | null = null;

        if (parsed.externalSystem && parsed.externalId) {
          const existing = db
            .prepare("SELECT id FROM trace_entities WHERE external_system = ? AND external_id = ?")
            .get(parsed.externalSystem, parsed.externalId) as { id: string } | undefined;
          if (existing) existingId = existing.id;
        }

        const entityId = existingId || id;

        const entity: TraceEntity = {
          id: entityId,
          type: parsed.type as EntityType,
          external_system: parsed.externalSystem || null,
          external_id: parsed.externalId || null,
          external_url: parsed.externalUrl || null,
          title: parsed.title,
          description: parsed.description || null,
          status: parsed.status || null,
          metadata_json: parsed.metadata ? JSON.stringify(parsed.metadata) : null,
          created_at: existingId ? (db.prepare("SELECT created_at FROM trace_entities WHERE id = ?").get(entityId) as TraceEntity)?.created_at || now : now,
          updated_at: now,
          last_synced_at: null,
          sync_status: "local" as const,
        };

        if (existingId) {
          db.prepare(
            `UPDATE trace_entities SET type=?, title=?, description=?, status=?, metadata_json=?, updated_at=?, external_system=?, external_id=?, external_url=? WHERE id=?`
          ).run(
            entity.type, entity.title, entity.description, entity.status,
            entity.metadata_json, entity.updated_at,
            entity.external_system, entity.external_id, entity.external_url,
            entity.id
          );
        } else {
          db.prepare(
            `INSERT INTO trace_entities (id, type, external_system, external_id, external_url, title, description, status, metadata_json, created_at, updated_at, last_synced_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            entity.id, entity.type, entity.external_system, entity.external_id,
            entity.external_url, entity.title, entity.description, entity.status,
            entity.metadata_json, entity.created_at, entity.updated_at,
            entity.last_synced_at, entity.sync_status
          );
        }

        return { content: [{ type: "text", text: JSON.stringify(entity, null, 2) }] };
      }

      case "link_entities": {
        const parsed = LinkEntitiesSchema.parse(args);
        const db = getDb();
        const now = new Date().toISOString();

        const existing = db
          .prepare("SELECT id FROM trace_links WHERE from_entity_id = ? AND to_entity_id = ? AND link_type = ?")
          .get(parsed.fromEntityId, parsed.toEntityId, parsed.linkType) as { id: string } | undefined;

        if (existing) {
          return { content: [{ type: "text", text: JSON.stringify({ id: existing.id, message: "Link already exists, skipped duplicate" }) }] };
        }

        const link = {
          id: uuid(),
          from_entity_id: parsed.fromEntityId,
          to_entity_id: parsed.toEntityId,
          link_type: parsed.linkType as LinkType,
          rationale: parsed.rationale || null,
          metadata_json: parsed.metadata ? JSON.stringify(parsed.metadata) : null,
          created_at: now,
          updated_at: now,
        };

        db.prepare(
          `INSERT INTO trace_links (id, from_entity_id, to_entity_id, link_type, rationale, metadata_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(link.id, link.from_entity_id, link.to_entity_id, link.link_type, link.rationale, link.metadata_json, link.created_at, link.updated_at);

        return { content: [{ type: "text", text: JSON.stringify(link, null, 2) }] };
      }

      case "add_evidence": {
        const parsed = AddEvidenceSchema.parse(args);
        const db = getDb();
        const now = new Date().toISOString();

        const evidence: TraceEvidence = {
          id: uuid(),
          entity_id: parsed.entityId,
          evidence_type: parsed.evidenceType,
          title: parsed.title,
          source_url: parsed.sourceUrl || null,
          file_path: parsed.filePath || null,
          summary: parsed.summary || null,
          metadata_json: parsed.metadata ? JSON.stringify(parsed.metadata) : null,
          created_at: now,
        };

        db.prepare(
          `INSERT INTO trace_evidence (id, entity_id, evidence_type, title, source_url, file_path, summary, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(evidence.id, evidence.entity_id, evidence.evidence_type, evidence.title, evidence.source_url, evidence.file_path, evidence.summary, evidence.metadata_json, evidence.created_at);

        return { content: [{ type: "text", text: JSON.stringify(evidence, null, 2) }] };
      }

      case "get_trace": {
        const parsed = GetTraceSchema.parse(args);
        const trace = getTrace(parsed.entityId, parsed.depth, parsed.direction);
        return { content: [{ type: "text", text: JSON.stringify(trace, null, 2) }] };
      }

      case "generate_trace_report": {
        const parsed = GenerateTraceReportSchema.parse(args);
        const trace = getTrace(parsed.entityId);
        const now = new Date().toISOString();

        if (parsed.format === "json") {
          const report = {
            entity: trace.entity,
            upstream: trace.upstream,
            downstream: trace.downstream,
            evidence: trace.evidence,
            gaps: trace.gaps,
            recommendations: trace.gaps.map((g) => g.message),
            generatedAt: now,
          };
          return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
        }

        const md = generateMarkdownReport(trace);
        const safeName = trace.entity.title.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase().slice(0, 60);
        const filename = `trace_report_${safeName}_${now.replace(/[:.]/g, "-")}.md`;

        const reportDir = config.reportDir;
        const fs = await import("fs");
        const path = await import("path");
        fs.mkdirSync(reportDir, { recursive: true });
        const reportPath = path.join(reportDir, filename);
        fs.writeFileSync(reportPath, md, "utf-8");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                format: "markdown",
                reportPath,
                entity: { id: trace.entity.id, title: trace.entity.title, type: trace.entity.type },
                gaps: trace.gaps.length,
                upstream: trace.upstream.length,
                downstream: trace.downstream.length,
                evidence: trace.evidence.length,
                recommendations: trace.gaps.length,
              }, null, 2),
            },
          ],
        };
      }

      case "sync_from_jira": {
        if (!config.jiraEnabled) throw new Error("Jira integration is disabled (JIRA_ENABLED=false)");
        const parsed = SyncFromJiraSchema.parse(args);
        const result = await syncFromJira(parsed.jql, parsed.projectKey, parsed.maxResults);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "sync_to_jira": {
        if (!config.jiraEnabled) throw new Error("Jira integration is disabled (JIRA_ENABLED=false)");
        const parsed = SyncToJiraSchema.parse(args);
        const result = await syncToJira(parsed.entityId, parsed.createIfMissing);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "sync_from_confluence": {
        if (!config.confluenceEnabled) throw new Error("Confluence integration is disabled (CONFLUENCE_ENABLED=false)");
        const parsed = SyncFromConfluenceSchema.parse(args);
        const result = await syncFromConfluence(parsed.spaceKey, parsed.cql, parsed.maxResults);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "publish_trace_report_to_confluence": {
        if (!config.confluenceEnabled) throw new Error("Confluence integration is disabled (CONFLUENCE_ENABLED=false)");
        const parsed = PublishTraceReportSchema.parse(args);
        const trace = getTrace(parsed.entityId);
        const html = generateHtmlContent(trace);
        const title = parsed.title || `Traceability Report: ${trace.entity.title}`;

        const confluence = await import("./confluence.js");

        let pageId: string | undefined;

        if (parsed.parentPageId) {
          pageId = parsed.parentPageId;
        } else {
          const db = getDb();
          const existingPage = db
            .prepare("SELECT external_id FROM trace_entities WHERE external_system = 'confluence' AND type = 'decision' AND title = ?")
            .get(title) as { external_id: string } | undefined;
          if (existingPage) pageId = existingPage.external_id;
        }

        let result: { id: string; url: string };

        if (pageId) {
          const page = await confluence.getConfluencePage(pageId);
          result = await confluence.updateConfluencePage({
            pageId,
            title,
            content: html,
            version: page.version,
          });
        } else {
          result = await confluence.createConfluencePage({
            spaceKey: config.confluenceSpaceKey,
            title,
            parentPageId: parsed.parentPageId,
            content: html,
          });
        }

        return { content: [{ type: "text", text: JSON.stringify({ pageId: result.id, url: result.url }, null, 2) }] };
      }

      case "search_trace": {
        const parsed = SearchTraceSchema.parse(args);
        const results = searchTraceEntities(parsed.query, parsed.types, parsed.limit);
        return { content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }] };
      }

      case "sync_all": {
        const parsed = SyncAllSchema.parse(args);
        const results = await syncAll({ jira: parsed.jira, confluence: parsed.confluence });
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Traceability MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
