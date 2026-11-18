import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import { DocumentMetadata } from '../types';

export async function parsePdf(filePath: string): Promise<{ text: string; metadata: DocumentMetadata }> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return {
    text: data.text,
    metadata: {
      totalPages: data.numpages || 1,
      textLength: data.text.length,
    },
  };
}
