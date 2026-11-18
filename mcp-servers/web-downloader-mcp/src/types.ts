export type DownloadResultStatus = "completed" | "failed" | "rejected";

export type DownloadFormat = "auto" | "text" | "binary" | "html" | "json";

export interface DownloadRequest {
  url: string;
  targetPath?: string;
  fileName?: string;
  format?: DownloadFormat;
  headers?: Record<string, string>;
}

export interface DownloadResult {
  success: boolean;
  url: string;
  status: DownloadResultStatus;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  error?: string;
}

export interface DownloadMetadata {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  downloadDate: string;
  checksumSha256: string;
}

export interface BatchDownloadRequest {
  items: DownloadRequest[];
  parallel?: boolean;
  maxConcurrent?: number;
}

export interface BatchDownloadResult {
  success: boolean;
  totalItems: number;
  completed: number;
  failed: number;
  results: DownloadResult[];
  durationMs: number;
}

export interface WebPageInfo {
  url: string;
  title: string;
  contentLength: number;
  mimeType: string;
  statusCode: number;
  headers: Record<string, string>;
}

export interface HtmlExtractResult {
  url: string;
  title: string;
  textContent: string;
  links: string[];
  images: string[];
  meta: Record<string, string>;
  headers: Record<string, string>;
  statusCode: number;
}
