import { chromium } from "playwright";
import * as cheerio from "cheerio";
import path from "path";
import fs from "fs";
import { config } from "./config.js";
import type { ExtractedPage, SearchResult } from "./types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText($: cheerio.CheerioAPI): string {
  const removeSelectors = [
    "script", "style", "noscript", "iframe", "svg",
    "nav", "header", "footer",
    ".nav", ".navbar", ".header", ".footer", ".sidebar",
    "[role=navigation]", "[role=complementary]",
    "#nav", "#navbar", "#header", "#footer", "#sidebar",
  ];

  for (const sel of removeSelectors) {
    $(sel).remove();
  }

  const body = $("body");
  if (!body.length) return "";

  const text = body.text();
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

export async function extractPage(
  url: string,
  maxChars: number = 15000,
  screenshot: boolean = false
): Promise<ExtractedPage> {
  const browser = await chromium.launch({
    headless: config.browserHeadless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: config.browserTimeoutMs,
    });

    await sleep(1500);

    const pageTitle = await page.title();
    const finalUrl = page.url();

    const html = await page.content();
    const $ = cheerio.load(html);
    let text = cleanText($);

    if (text.length > maxChars) {
      text = text.slice(0, maxChars) + "\n\n[... truncated at " + maxChars + " characters]";
    }

    let screenshotPath: string | undefined;

    if (screenshot) {
      const dir = path.join(config.evidenceDir, "screenshots");
      fs.mkdirSync(dir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeName = url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60);
      screenshotPath = path.join(dir, `${safeName}_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    return {
      title: pageTitle,
      url,
      finalUrl,
      extractedAt: new Date().toISOString(),
      text,
      screenshotPath,
    };
  } finally {
    await browser.close();
  }
}

export async function searchBrowser(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  const response = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `q=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const results: SearchResult[] = [];

  $(".result").each((_i, el) => {
    const linkEl = $(el).find(".result__a").first();
    const snippetEl = $(el).find(".result__snippet").first();

    const title = linkEl.text().trim();
    const href = linkEl.attr("href") || "";
    const snippet = snippetEl.text().trim();

    const isAd = href.includes("duckduckgo.com/y.js") || href.includes("//duckduckgo.com/l/");
    if (title && href.startsWith("http") && !isAd) {
      results.push({ title, url: href, snippet, source: "duckduckgo", engine: "browser" });
    }
  });

  return results.slice(0, maxResults);
}
