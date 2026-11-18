import * as XLSX from 'xlsx';
import { DocumentMetadata } from '../types';

export async function parseXlsx(filePath: string): Promise<{ text: string; metadata: DocumentMetadata }> {
  const workbook = XLSX.readFile(filePath);
  const sheetNames: string[] = workbook.SheetNames;
  let combinedText = "";

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);
    combinedText += `\n\n--- Sheet: ${sheetName} ---\n${JSON.stringify(json, null, 2)}\n\n`;
  }

  return {
    text: combinedText,
    metadata: {
      sheetCount: sheetNames.length,
      fileName: filePath.split('/').pop() || filePath.split('\\').pop(),
    },
  };
}
