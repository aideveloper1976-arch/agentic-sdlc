// tools/document-intake-mcp/src/parsers/docx.ts

import mammoth from 'mammoth';
import { DocumentMetadata } from '../types';

export async function parseDocx(filePath: string): Promise<{ text: string, metadata: DocumentMetadata }> {
    console.log(`Parsing DOCX file: ${filePath}`);
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return { 
            text: result.value, 
            metadata: {
                fileSize: Math.round(new Date().getTime() / 1000),
                textLength: result.value.length
            }
        };
    } catch (error) {
        console.error("Failed to parse DOCX:", error);
        throw new Error("Unsupported DOCX format or file corruption.");
    }
}