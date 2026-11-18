// tools/document-intake-mcp/src/parsers/markdown.ts

import { DocumentMetadata } from '../types';
import * as fs from 'fs/promises';

export async function parseMarkdown(filePath: string): Promise<{ text: string, metadata: DocumentMetadata }> {
    console.log(`Parsing MD file: ${filePath}`);
    try {
        const text = await fs.readFile(filePath, { encoding: 'utf-8' });
        return { 
            text: text, 
            metadata: {
                lineCount: text.split('\n').length
            }
        };
    } catch (error) {
        console.error("Failed to parse Markdown:", error);
        throw new Error("Cannot read Markdown file.");
    }
}