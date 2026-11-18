import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "./config.js";
import type {
  DownloadResult,
  DownloadFormat,
  WebPageInfo,
  HtmlExtractResult,
} from "./types.js";

function generateId(): string {
  return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function isDomainAllowed(urlStr: string): boolean {
  if (config.allowedDomains.includes("*")) return true;
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    return config.allowedDomains.some((domain) => {
      if (domain.startsWith("*.")) {
        return hostname.endsWith(domain.slice(1));
      }
      return hostname === domain;
    });
  } catch {
    return false;
  }
}

function hasBlockedExtension(urlStr: string): boolean {
  const ext = path.extname(new URL(urlStr).pathname).toLowerCase();
  return config.blockedExtensions.includes(ext);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 255);
}

function determineFileName(url: URL, contentType: string, format?: DownloadFormat): string {
  const pathname = url.pathname;
  const basename = path.basename(pathname);
  const ext = path.extname(pathname);

  if (basename && ext) {
    return sanitizeFileName(basename);
  }

  const extMap: Record<string, string> = {
    "text/html": ".html",
    "text/plain": ".txt",
    "application/json": ".json",
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/zip": ".zip",
    "application/xml": ".xml",
    "text/css": ".css",
    "text/javascript": ".js",
    "application/javascript": ".js",
  };

  const detectedExt = extMap[contentType] || ".bin";
  return sanitizeFileName(`${url.hostname}${detectedExt}`);
}

function parseContentType(headers: Headers): string {
  const ct = headers.get("content-type") || "";
  return ct.split(";")[0].trim().toLowerCase();
}

function parseContentLength(headers: Headers): number {
  const cl = headers.get("content-length");
  return cl ? parseInt(cl, 10) : 0;
}

export async function downloadWebContent(params: {
  url: string;
  targetPath?: string;
  fileName?: string;
  format?: DownloadFormat;
  headers?: Record<string, string>;
}): Promise<DownloadResult> {
  const startTime = Date.now();

  if (!isDomainAllowed(params.url)) {
    return {
      success: false,
      url: params.url,
      status: "rejected",
      error: `Domain not allowed. Configure ALLOWED_DOMAINS to include: ${new URL(params.url).hostname}`,
      durationMs: Date.now() - startTime,
    };
  }

  if (hasBlockedExtension(params.url)) {
    return {
      success: false,
      url: params.url,
      status: "rejected",
      error: `File extension blocked: ${path.extname(new URL(params.url).pathname)}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const customHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ...(params.headers || {}),
    };

    const response = await fetch(params.url, {
      method: "GET",
      headers: customHeaders,
      signal: AbortSignal.timeout(config.downloadTimeoutMs),
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        success: false,
        url: params.url,
        status: "failed",
        error: `HTTP ${response.status}: ${response.statusText}`,
        durationMs: Date.now() - startTime,
      };
    }

    const contentType = parseContentType(response.headers);
    const contentLength = parseContentLength(response.headers);

    if (contentLength > config.maxFileSize) {
      return {
        success: false,
        url: params.url,
        status: "rejected",
        error: `File too large (${contentLength} bytes). Max: ${config.maxFileSize} bytes`,
        durationMs: Date.now() - startTime,
      };
    }

    const url = new URL(params.url);
    const fileName =
      params.fileName || determineFileName(url, contentType, params.format);
    const downloadDir = params.targetPath
      ? path.resolve(params.targetPath)
      : path.resolve(config.downloadDir);

    fs.mkdirSync(downloadDir, { recursive: true });

    const filePath = path.join(downloadDir, fileName);

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > config.maxFileSize) {
      return {
        success: false,
        url: params.url,
        status: "rejected",
        error: `Downloaded content too large (${buffer.byteLength} bytes)`,
        durationMs: Date.now() - startTime,
      };
    }

    fs.writeFileSync(filePath, Buffer.from(buffer));

    return {
      success: true,
      url: params.url,
      status: "completed",
      filePath,
      fileName,
      mimeType: contentType,
      sizeBytes: buffer.byteLength,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("aborted") || message.includes("timeout")) {
      return {
        success: false,
        url: params.url,
        status: "failed",
        error: `Download timed out after ${config.downloadTimeoutMs}ms`,
        durationMs: Date.now() - startTime,
      };
    }
    return {
      success: false,
      url: params.url,
      status: "failed",
      error: message,
      durationMs: Date.now() - startTime,
    };
  }
}

export async function fetchWebPageInfo(urlStr: string): Promise<WebPageInfo> {
  const response = await fetch(urlStr, {
    method: "HEAD",
    signal: AbortSignal.timeout(config.downloadTimeoutMs),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    url: response.url,
    title: "",
    contentLength: parseContentLength(response.headers),
    mimeType: parseContentType(response.headers),
    statusCode: response.status,
    headers: responseHeaders,
  };
}

export async function fetchAndExtractHtml(params: {
  url: string;
}): Promise<HtmlExtractResult> {
  const response = await fetch(params.url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(config.downloadTimeoutMs),
    redirect: "follow",
  });

  const html = await response.text();

  const title = extractTitle(html);
  const textContent = extractText(html);
  const links = extractLinks(html, response.url);
  const images = extractImages(html, response.url);
  const meta = extractMeta(html);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    url: response.url,
    title,
    textContent,
    links,
    images,
    meta,
    headers: responseHeaders,
    statusCode: response.status,
  };
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const absolute = new URL(match[1], baseUrl).href;
      if (absolute.startsWith("http://") || absolute.startsWith("https://")) {
        links.push(absolute);
      }
    } catch {
      continue;
    }
  }
  return [...new Set(links)].slice(0, 100);
}

function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const regex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const absolute = new URL(match[1], baseUrl).href;
      images.push(absolute);
    } catch {
      continue;
    }
  }
  return [...new Set(images)].slice(0, 50);
}

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const regex = /<meta[^>]+(?:name|property)\s*=\s*["']([^"']+)["'][^>]+content\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    meta[match[1].toLowerCase()] = match[2];
  }
  return meta;
}
