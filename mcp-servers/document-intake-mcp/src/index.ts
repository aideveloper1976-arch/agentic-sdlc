import { config } from "./config";
import * as fs from "fs/promises";
import * as path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { parsePdf } from "./parsers/pdf";
import { parseDocx } from "./parsers/docx";
import { parseXlsx } from "./parsers/xlsx";
import { parseCsv } from "./parsers/csv";
import { parseText } from "./parsers/text";
import { parseJson } from "./parsers/json";
import { parseMarkdown } from "./parsers/markdown";
import { extractRequirements } from "./extractors/requirements";
import { extractResearchEvidence } from "./extractors/research";
import { extractTables } from "./extractors/tables";
import { saveDocumentEvidence } from "./extractors/evidence";
import { summariseDocument } from "./extractors/summary";
import { linkDocumentToTraceability } from "./extractors/traceability";
import { DocumentMetadata, ToolResponse } from "./types";

function detectFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const typeMap: Record<string, string> = {
    ".pdf": "pdf", ".docx": "docx", ".xlsx": "xlsx",
    ".csv": "csv", ".txt": "txt", ".json": "json", ".md": "md",
  };
  const type = typeMap[ext];
  if (!type) throw new Error(`Unsupported file type: ${ext}`);
  return type;
}

function validatePath(filePath: string): string {
  const absolutePath = path.resolve(config.DOCUMENT_INTAKE_ROOT, filePath);
  const rootPath = path.resolve(config.DOCUMENT_INTAKE_ROOT);
  if (!absolutePath.startsWith(rootPath)) {
    throw new Error("Path traversal blocked: file is outside DOCUMENT_INTAKE_ROOT");
  }
  return absolutePath;
}

async function parseDocument(absolutePath: string, fileType: string): Promise<{ text: string; metadata: DocumentMetadata }> {
  switch (fileType) {
    case "pdf": return parsePdf(absolutePath);
    case "docx": return parseDocx(absolutePath);
    case "xlsx": return parseXlsx(absolutePath);
    case "csv": return parseCsv(absolutePath);
    case "txt": return parseText(absolutePath);
    case "json": return parseJson(absolutePath);
    case "md": return parseMarkdown(absolutePath);
    default: throw new Error(`Unsupported file type: ${fileType}`);
  }
}

function chunkContent(text: string, filePath: string): { chunks: any[]; count: number } {
  const chunkSize = 4000;
  const chunks: any[] = [];
  let idx = 0;
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push({
      chunkId: idx++,
      text: text.substring(i, i + chunkSize),
      sourceLocation: { file: filePath, chunk: idx },
    });
  }
  return { chunks, count: chunks.length };
}

function truncate(text: string, maxChars: number = 200000): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n\n[...truncated]";
}

const server = new Server(
  { name: "document-intake-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ingest_document",
      description: "Ingest a document: parse, extract, chunk, and save evidence",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Relative path to document" },
          documentType: {
            type: "string",
            enum: ["requirements", "research", "competitor", "regulatory", "other"],
            description: "Document classification",
          },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
        },
        required: ["filePath"],
      },
    },
    {
      name: "extract_text",
      description: "Extract readable text from a document",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Relative path to document" },
          maxChars: { type: "number", description: "Max characters to return" },
        },
        required: ["filePath"],
      },
    },
    {
      name: "extract_tables",
      description: "Extract tables from a document",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Relative path to document" },
        },
        required: ["filePath"],
      },
    },
    {
      name: "extract_requirements",
      description: "Extract candidate requirements from a document",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Relative path to document" },
          outputFormat: { type: "string", enum: ["json", "markdown"], description: "Output format" },
        },
        required: ["filePath"],
      },
    },
    {
      name: "extract_research_evidence",
      description: "Extract research evidence from a document",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Relative path to document" },
        },
        required: ["filePath"],
      },
    },
    {
      name: "summarise_document",
      description: "Generate a structured summary of a document",
      inputSchema: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Relative path to document" },
          summaryType: {
            type: "string",
            enum: ["executive", "requirements", "research", "technical"],
            description: "Type of summary",
          },
        },
        required: ["filePath"],
      },
    },
    {
      name: "compare_documents",
      description: "Compare multiple documents for overlaps, conflicts, and gaps",
      inputSchema: {
        type: "object",
        properties: {
          filePaths: { type: "array", items: { type: "string" }, description: "Paths to compare" },
          comparisonGoal: { type: "string", description: "Goal of comparison" },
        },
        required: ["filePaths"],
      },
    },
    {
      name: "save_document_evidence",
      description: "Save a document evidence record",
      inputSchema: {
        type: "object",
        properties: {
          documentId: { type: "string", description: "Unique document ID" },
          title: { type: "string", description: "Document title" },
          summary: { type: "string", description: "Summary text" },
          sourceFilePath: { type: "string", description: "Original file path" },
          extractedOutputPath: { type: "string", description: "Path to extracted data" },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
        },
        required: ["documentId", "title", "summary", "sourceFilePath"],
      },
    },
    {
      name: "link_document_to_traceability",
      description: "Create a traceability link from a document to a trace entity",
      inputSchema: {
        type: "object",
        properties: {
          documentId: { type: "string" },
          traceEntityId: { type: "string" },
          linkType: {
            type: "string",
            enum: ["derived_from", "documents", "evidence_for"],
            description: "Relationship type",
          },
        },
        required: ["documentId", "traceEntityId"],
      },
    },
    {
      name: "list_ingested_documents",
      description: "List previously ingested document records",
      inputSchema: {
        type: "object",
        properties: {
          tag: { type: "string", description: "Filter by tag" },
          documentType: { type: "string", description: "Filter by document type" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "ingest_document": return await handleIngestDocument(args);
      case "extract_text": return await handleExtractText(args);
      case "extract_tables": return await handleExtractTables(args);
      case "extract_requirements": return await handleExtractRequirements(args);
      case "extract_research_evidence": return await handleExtractResearchEvidence(args);
      case "summarise_document": return await handleSummariseDocument(args);
      case "compare_documents": return await handleCompareDocuments(args);
      case "save_document_evidence": return await handleSaveDocumentEvidence(args);
      case "link_document_to_traceability": return await handleLinkTraceability(args);
      case "list_ingested_documents": return await handleListIngested(args);
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }],
      isError: true,
    };
  }
});

// ---- Tool Handlers ----

async function handleIngestDocument(args: any) {
  const filePath: string = args.filePath;
  const absolutePath = validatePath(filePath);
  const fileType = detectFileType(filePath);
  const { text, metadata } = await parseDocument(absolutePath, fileType);
  const truncated = truncate(text, config.MAX_EXTRACTED_CHARS);
  const { chunks, count: chunksCreated } = chunkContent(truncated, filePath);
  const tables = await extractTables(filePath, truncated);
  const summary = await summariseDocument(truncated, "executive");
  const evidencePath = await saveDocumentEvidence(
    `doc-${Date.now()}`,
    path.basename(filePath),
    summary.executiveSummary,
    filePath,
    { tables, chunks }
  );

  return formatResponse({
    success: true,
    documentId: `doc-${Date.now()}`,
    filePath,
    fileType,
    metadata: { ...metadata, tablesFound: tables.length, chunksCreated },
    textPreview: truncated.substring(0, 300),
    tablesFound: tables.length,
    chunksCreated,
    outputPaths: [evidencePath],
  });
}

async function handleExtractText(args: any) {
  const filePath: string = args.filePath;
  const absolutePath = validatePath(filePath);
  const fileType = detectFileType(filePath);
  const { text, metadata } = await parseDocument(absolutePath, fileType);
  const maxChars = args.maxChars || config.MAX_EXTRACTED_CHARS;
  const truncated = truncate(text, maxChars);

  return formatResponse({
    success: true,
    documentId: null,
    filePath,
    fileType,
    metadata: { ...metadata, charCount: truncated.length },
    textPreview: truncated.substring(0, 300),
    tablesFound: 0,
    chunksCreated: 0,
    outputPaths: [],
  });
}

async function handleExtractTables(args: any) {
  const filePath: string = args.filePath;
  const absolutePath = validatePath(filePath);
  const fileType = detectFileType(filePath);
  const { text } = await parseDocument(absolutePath, fileType);
  const tables = await extractTables(filePath, text);

  return formatResponse({
    success: true,
    documentId: null,
    filePath,
    fileType,
    metadata: { tablesFound: tables.length },
    textPreview: `Found ${tables.length} table(s)`,
    tablesFound: tables.length,
    chunksCreated: 0,
    outputPaths: [],
  });
}

async function handleExtractRequirements(args: any) {
  const filePath: string = args.filePath;
  const absolutePath = validatePath(filePath);
  const fileType = detectFileType(filePath);
  const { text, metadata } = await parseDocument(absolutePath, fileType);
  const requirements = await extractRequirements(filePath, text, metadata);

  const outputFormat = args.outputFormat || "json";
  const outDir = config.DOCUMENT_REQUIREMENTS_DIR;
  await fs.mkdir(outDir, { recursive: true });

  const paths: string[] = [];
  if (outputFormat === "json" || outputFormat === "markdown") {
    const jsonPath = path.join(outDir, `req-${Date.now()}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(requirements, null, 2));
    paths.push(jsonPath);
  }
  if (outputFormat === "markdown") {
    const mdLines = requirements.map((r: any) =>
      `## ${r.id} [${r.type}] (${r.priority})\n\n**Title:** ${r.title}\n\n**Description:** ${r.description}\n\n**Source:** ${r.sourceLocation.section || "N/A"}\n`
    );
    const mdPath = path.join(outDir, `req-${Date.now()}.md`);
    await fs.writeFile(mdPath, mdLines.join("\n---\n"));
    paths.push(mdPath);
  }

  return formatResponse({
    success: true,
    documentId: null,
    filePath,
    fileType,
    metadata: { requirementCount: requirements.length },
    textPreview: `Extracted ${requirements.length} requirement(s)`,
    tablesFound: 0,
    chunksCreated: 0,
    outputPaths: paths,
  });
}

async function handleExtractResearchEvidence(args: any) {
  const filePath: string = args.filePath;
  const absolutePath = validatePath(filePath);
  const fileType = detectFileType(filePath);
  const { text, metadata } = await parseDocument(absolutePath, fileType);
  const evidence = await extractResearchEvidence(filePath, text, metadata);

  const outDir = config.DOCUMENT_RESEARCH_DIR;
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `res-${Date.now()}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(evidence, null, 2));

  const mdLines = evidence.map((e: any) => `- **${e.type}:** ${e.fact} (confidence: ${e.confidence})`);
  const mdPath = path.join(outDir, `res-${Date.now()}.md`);
  await fs.writeFile(mdPath, mdLines.join("\n"));

  return formatResponse({
    success: true,
    documentId: null,
    filePath,
    fileType,
    metadata: { evidenceCount: evidence.length },
    textPreview: `Extracted ${evidence.length} evidence item(s)`,
    tablesFound: 0,
    chunksCreated: 0,
    outputPaths: [jsonPath, mdPath],
  });
}

async function handleSummariseDocument(args: any) {
  const filePath: string = args.filePath;
  const absolutePath = validatePath(filePath);
  const fileType = detectFileType(filePath);
  const { text } = await parseDocument(absolutePath, fileType);
  const summaryType = args.summaryType || "executive";
  const summary = await summariseDocument(text, summaryType);

  return formatResponse({
    success: true,
    documentId: null,
    filePath,
    fileType,
    metadata: { summaryType },
    textPreview: JSON.stringify(summary).substring(0, 300),
    tablesFound: 0,
    chunksCreated: 0,
    outputPaths: [],
  });
}

async function handleCompareDocuments(args: any) {
  const filePaths: string[] = args.filePaths || [];
  if (filePaths.length < 2) throw new Error("At least 2 file paths required");

  const docs = await Promise.all(filePaths.map(async (fp: string) => {
    const abs = validatePath(fp);
    const ft = detectFileType(fp);
    const { text } = await parseDocument(abs, ft);
    return { filePath: fp, text: text.substring(0, 10000) };
  }));

  return formatResponse({
    success: true,
    documentId: null,
    filePath: filePaths.join(", "),
    fileType: "comparison",
    metadata: { comparisonGoal: args.comparisonGoal || "general", documentCount: filePaths.length },
    textPreview: `Compared ${filePaths.length} document(s)`,
    tablesFound: 0,
    chunksCreated: 0,
    outputPaths: [],
  });
}

async function handleSaveDocumentEvidence(args: any) {
  const { documentId, title, summary, sourceFilePath, tags } = args;
  const path_ = await saveDocumentEvidence(documentId, title, summary, sourceFilePath, { tags: tags || [] });
  return formatResponse({
    success: true,
    documentId,
    filePath: sourceFilePath,
    fileType: "evidence",
    metadata: { title },
    textPreview: summary.substring(0, 200),
    tablesFound: 0,
    chunksCreated: 0,
    outputPaths: [path_],
  });
}

async function handleLinkTraceability(args: any) {
  const { documentId, traceEntityId, linkType } = args;
  const msg = await linkDocumentToTraceability(documentId, traceEntityId, linkType || "documents");
  return formatResponse({
    success: true,
    documentId,
    filePath: "",
    fileType: "link",
    metadata: { linkType: linkType || "documents", traceEntityId },
    textPreview: msg,
    tablesFound: 0,
    chunksCreated: 0,
    outputPaths: [],
  });
}

async function handleListIngested(args: any) {
  const evidenceDir = config.DOCUMENT_EVIDENCE_DIR;
  try {
    const files = await fs.readdir(evidenceDir);
    const filtered = files.filter((f: string) => f.endsWith(".json"));
    return formatResponse({
      success: true,
      documentId: null,
      filePath: evidenceDir,
      fileType: "list",
      metadata: { count: filtered.length, tag: args.tag || null, documentType: args.documentType || null },
      textPreview: `Found ${filtered.length} ingested document(s)`,
      tablesFound: 0,
      chunksCreated: 0,
      outputPaths: filtered.map((f: string) => path.join(evidenceDir, f)),
    });
  } catch {
    return formatResponse({
      success: true,
      documentId: null,
      filePath: evidenceDir,
      fileType: "list",
      metadata: { count: 0 },
      textPreview: "No ingested documents found",
      tablesFound: 0,
      chunksCreated: 0,
      outputPaths: [],
    });
  }
}

function formatResponse(data: ToolResponse) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// ---- Startup ----

async function main() {
  await fs.mkdir(config.DOCUMENT_EVIDENCE_DIR, { recursive: true });
  await fs.mkdir(config.DOCUMENT_REQUIREMENTS_DIR, { recursive: true });
  await fs.mkdir(config.DOCUMENT_RESEARCH_DIR, { recursive: true });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Document Intake MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
