export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  engine?: string;
}

export interface ExtractedPage {
  title: string;
  url: string;
  finalUrl: string;
  extractedAt: string;
  text: string;
  screenshotPath?: string;
}

export interface EvidenceRecord {
  id: string;
  topic: string;
  sourceUrl: string;
  title: string;
  summary: string;
  extractedText?: string;
  tags: string[];
  createdAt: string;
  filePaths: {
    json: string;
    markdown: string;
  };
}

export interface McpToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}
