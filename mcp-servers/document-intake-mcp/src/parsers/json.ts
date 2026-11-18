// tools/document-intake-mcp/src/parsers/json.ts

import { DocumentMetadata } from '../types';
import * as fs from 'fs/promises';

export async function parseJson(filePath: string): Promise<{ text: string, metadata: DocumentMetadata }> {
    console.log(`Parsing JSON file: ${filePath}`);
    try {
        const data = await fs.readFile(filePath, { encoding: 'utf-8' });
        const jsonObject = JSON.parse(data);
        return { 
            text: JSON.stringify(jsonObject, null, 2), 
            metadata: {
                keysCount: Object.keys(jsonObject).length
            }
        };
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        throw new Error("Unsupported JSON format or syntax error.");
    }
}