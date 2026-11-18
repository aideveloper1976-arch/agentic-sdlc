import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

export interface WebDownloaderConfig {
  allowedDomains: string[];
  maxFileSize: number;
  downloadTimeoutMs: number;
  downloadDir: string;
  blockedExtensions: string[];
}

function parseList(value: string | undefined, delimiter = ","): string[] {
  if (!value) return [];
  return value
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBlockedExtensions(value: string | undefined): string[] {
  return parseList(value).map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
}

export function loadConfig(): WebDownloaderConfig {
  return {
    allowedDomains: parseList(process.env.ALLOWED_DOMAINS || "*"),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "52428800", 10),
    downloadTimeoutMs: parseInt(process.env.DOWNLOAD_TIMEOUT_MS || "30000", 10),
    downloadDir: process.env.DOWNLOAD_DIR
      ? path.resolve(process.env.DOWNLOAD_DIR)
      : path.resolve(process.cwd(), "downloads"),
    blockedExtensions: parseBlockedExtensions(
      process.env.BLOCKED_EXTENSIONS ||
        ".exe,.dll,.so,.dylib,.bat,.cmd,.ps1,.sh,.app,.msi,.jar,.class"
    ),
  };
}

export const config = loadConfig();
