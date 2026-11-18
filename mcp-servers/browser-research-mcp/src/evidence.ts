import path from "path";
import fs from "fs";
import crypto from "crypto";
import { config } from "./config.js";
import type { EvidenceRecord } from "./types.js";

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

export function saveEvidence(params: {
  topic: string;
  sourceUrl: string;
  title?: string;
  summary: string;
  extractedText?: string;
  tags?: string[];
}): EvidenceRecord {
  const id = generateId();
  const createdAt = new Date().toISOString();
  const safeTopic = sanitizeFilename(params.topic);
  const timestamp = createdAt.replace(/[:.]/g, "-");
  const filename = `${safeTopic}_${id}_${timestamp}`;

  const jsonDir = path.join(config.evidenceDir, "json");
  const mdDir = config.evidenceDir;

  fs.mkdirSync(jsonDir, { recursive: true });

  const record: EvidenceRecord = {
    id,
    topic: params.topic,
    sourceUrl: params.sourceUrl,
    title: params.title || "Untitled",
    summary: params.summary,
    extractedText: params.extractedText,
    tags: params.tags || [],
    createdAt,
    filePaths: {
      json: path.join(jsonDir, `${filename}.json`),
      markdown: path.join(mdDir, `${filename}.md`),
    },
  };

  fs.writeFileSync(record.filePaths.json, JSON.stringify(record, null, 2), "utf-8");

  const mdContent = [
    `# ${record.title}`,
    "",
    `**Topic:** ${record.topic}`,
    `**Source:** ${record.sourceUrl}`,
    `**Created:** ${record.createdAt}`,
    `**Tags:** ${record.tags.join(", ")}`,
    "",
    "## Summary",
    "",
    params.summary,
    "",
  ].join("\n");

  const mdBody = params.extractedText
    ? ["", "## Extracted Content", "", "```", params.extractedText.slice(0, 10000), "```", ""].join("\n")
    : "";

  fs.writeFileSync(record.filePaths.markdown, mdContent + mdBody, "utf-8");

  return record;
}
