import { config } from '../config';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function linkDocumentToTraceability(
  documentId: string,
  traceEntityId: string,
  linkType?: "derived_from" | "documents" | "evidence_for"
): Promise<string> {
  const payload = {
    sourceDocumentId: documentId,
    targetEntityId: traceEntityId,
    linkType: linkType || "documents",
    timestamp: new Date().toISOString(),
  };

  await fs.mkdir(config.DOCUMENT_EVIDENCE_DIR, { recursive: true });
  const linkFilePath = path.join(config.DOCUMENT_EVIDENCE_DIR, "pending-trace-links.json");

  let existing: any[] = [];
  try {
    const raw = await fs.readFile(linkFilePath, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    existing = [];
  }
  existing.push(payload);
  await fs.writeFile(linkFilePath, JSON.stringify(existing, null, 2));

  return `Traceability link created: ${documentId} -> ${traceEntityId} (${linkType || "documents"})`;
}
