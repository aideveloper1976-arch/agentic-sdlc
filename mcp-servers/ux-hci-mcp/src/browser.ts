import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from './config.js';

let browserInstance: Browser | null = null;
let contextInstance: BrowserContext | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: config.headless });
  }
  return browserInstance;
}

export async function getContext(): Promise<BrowserContext> {
  if (!contextInstance) {
    const browser = await getBrowser();
    contextInstance = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'OpenCode-UX-HCI-MCP/1.0',
    });
  }
  return contextInstance;
}

export async function createPage(): Promise<Page> {
  const context = await getContext();
  return await context.newPage();
}

export async function closeBrowser(): Promise<void> {
  if (contextInstance) {
    await contextInstance.close();
    contextInstance = null;
  }
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
