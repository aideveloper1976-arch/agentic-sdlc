// tools/document-intake-mcp/src/parsers/text.ts

import { DocumentMetadata } from '../types';
import * as fs from 'fs/promises';

export async function parseText(filePath: string): Promise<{ text: string, metadata: DocumentMetadata }> {
    console.log(`Parsing TXT file: ${filePath}`);
    try {
        const text = await fs.readFile(filePath, { encoding: 'utf-8' });
        return { 
            text: text, 
            metadata: {
                textLength: text.length
            }
        };
    } catch (error) {
        console.error("Failed to parse TXT:", error);
        throw new Error("Cannot read TXT file.");
    }
}