import * as fs from 'fs';
import * as papaparse from 'papaparse';
import { DocumentMetadata } from '../types';

export async function parseCsv(filePath: string): Promise<{ text: string; metadata: DocumentMetadata }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = papaparse.parse(content, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const records = parsed.data as any[];

  let combinedText = "";
  records.forEach((row: any, index: number) => {
    combinedText += `Row ${index + 1}: ${JSON.stringify(row)}\n`;
  });

  return {
    text: combinedText,
    metadata: {
      columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
      rowCount: records.length,
    },
  };
}
