import { config } from '../config';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function saveDocumentEvidence(
  documentId: string,
  title: string,
  summary: string,
  sourceFilePath: string,
  extractedData: any
): Promise<string> {
  const evidenceRecord = {
    documentId,
    title,
    summary,
    sourceFilePath,
    evidenceDetails: extractedData,
    extractedAt: new Date().toISOString(),
  };

  await fs.mkdir(config.DOCUMENT_EVIDENCE_DIR, { recursive: true });
  const outputFilePath = path.join(config.DOCUMENT_EVIDENCE_DIR, `evidence-${documentId}-${Date.now()}.json`);
  await fs.writeFile(outputFilePath, JSON.stringify(evidenceRecord, null, 2));

  return outputFilePath;
}
