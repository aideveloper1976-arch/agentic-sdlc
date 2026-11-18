export interface DocumentMetadata {
  totalPages?: number;
  textLength?: number;
  fileSize?: number;
  sheetCount?: number;
  columnCount?: number;
  rowCount?: number;
  lineCount?: number;
  keysCount?: number;
  fileName?: string;
  page?: number;
  section?: string;
  [key: string]: unknown;
}

export interface SourceLocation {
  file: string;
  page?: number;
  section?: string;
}

export interface Requirement {
  id: string;
  type: "functional" | "non_functional" | "business_rule" | "compliance" | "assumption" | "dependency" | "risk" | "open_question";
  title: string;
  description: string;
  sourceText: string;
  sourceLocation: SourceLocation;
  priority: "MUST" | "SHOULD" | "MAY" | "unknown";
  confidence: "high" | "medium" | "low";
  inferred: boolean;
  openQuestions: string[];
}

export interface ResearchEvidence {
  fact: string;
  type: string;
  source: SourceLocation;
  confidence: "high" | "medium" | "low";
}

export interface Chunk {
  chunkId: number;
  text: string;
  sourceLocation: {
    file: string;
    chunk: number;
  };
}

export interface ExtractedTable {
  sheetName?: string;
  tableIndex: number;
  headers: string[];
  rows: string[][];
}

export interface ToolResponse {
  success: boolean;
  documentId: string | null;
  filePath: string;
  fileType: string;
  metadata: Record<string, unknown>;
  textPreview: string;
  tablesFound: number;
  chunksCreated: number;
  outputPaths: string[];
}
