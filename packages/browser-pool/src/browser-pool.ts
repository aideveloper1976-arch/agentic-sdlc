import { chromium, Browser, BrowserContext, Page } from 'playwright';

interface PoolOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  maxPages?: number;
}

export class BrowserPool {
  private static instance: BrowserPool;
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private options: PoolOptions;

  private constructor(options: PoolOptions = {}) {
    this.options = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      maxPages: 10,
      ...options,
    };
  }

  static getInstance(options?: PoolOptions): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool(options);
    }
    return BrowserPool.instance;
  }

  async acquire(label: string): Promise<{ page: Page; context: BrowserContext }> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.options.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const context = await this.browser.newContext({
      viewport: this.options.viewport,
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    this.contexts.set(label, context);
    this.pages.set(label, page);
    return { page, context };
  }

  async release(label: string): Promise<void> {
    const page = this.pages.get(label);
    const context = this.contexts.get(label);

    try { await page?.close(); } catch { /* ignore */ }
    try { await context?.close(); } catch { /* ignore */ }

    this.pages.delete(label);
    this.contexts.delete(label);
  }

  async shutdown(): Promise<void> {
    for (const [label] of this.pages) {
      await this.release(label);
    }
    await this.browser?.close();
    this.browser = null;
    (BrowserPool as any).instance = null;
  }
}
