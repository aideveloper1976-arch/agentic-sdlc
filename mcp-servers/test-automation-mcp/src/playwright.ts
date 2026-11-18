import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { TestStep, StepResult } from './types.js';
import { config, validateUrl, resolveUrl } from './config.js';

export interface LaunchOptions {
  headless?: boolean;
  slowMoMs?: number;
  recordVideoDir?: string;
}

export class PlaywrightManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private logs: string[] = [];

  async launch(options: LaunchOptions = {}): Promise<void> {
    const headless = options.headless ?? config.headless;
    const slowMo = options.slowMoMs ?? config.slowMoMs;
    this.browser = await chromium.launch({
      headless,
      slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      recordVideo: options.recordVideoDir ? { dir: options.recordVideoDir } : undefined,
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(config.defaultTimeout);
    this.logs = [];
    this.log('Browser launched');
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Browser not launched');

    const resolvedUrl = resolveUrl(url);
    const validation = validateUrl(resolvedUrl);
    if (!validation.valid) {
      throw new Error(`URL not allowed: ${validation.reason}`);
    }

    this.log(`Navigating to: ${resolvedUrl}`);
    await this.page.goto(resolvedUrl, {
      waitUntil: 'networkidle',
      timeout: config.defaultTimeout,
    });
  }

  async executeSteps(url: string, steps: TestStep[]): Promise<{ results: StepResult[]; screenshots: string[] }> {
    if (!this.page) throw new Error('Browser not launched');

    const results: StepResult[] = [];
    const screenshots: string[] = [];
    let hasFailure = false;

    const resolvedUrl = resolveUrl(url);
    const validation = validateUrl(resolvedUrl);
    if (!validation.valid) {
      throw new Error(`URL not allowed: ${validation.reason}`);
    }

    for (let i = 0; i < steps.length; i++) {
      if (hasFailure) {
        this.log(`Skipping step ${i} due to previous failure`);
        continue;
      }

      const step = steps[i];
      const stepResult = await this.executeStep(step, i, i === 0 ? resolvedUrl : undefined);
      results.push(stepResult);

      if (stepResult.screenshotPath) {
        screenshots.push(stepResult.screenshotPath);
      }

      if (!stepResult.passed) {
        hasFailure = true;
      }
    }

    const finalScreenshot = await this.captureScreenshot('final');
    if (finalScreenshot) {
      screenshots.push(finalScreenshot);
    }

    return { results, screenshots };
  }

  private async executeStep(step: TestStep, index: number, initialUrl?: string): Promise<StepResult> {
    if (!this.page) {
      return { action: step.action, passed: false, error: 'Browser not launched', durationMs: 0 };
    }

    const start = Date.now();
    const result: StepResult = {
      action: step.action,
      selector: step.selector,
      value: step.value,
      passed: false,
      durationMs: 0,
    };

    try {
      switch (step.action) {
        case 'goto': {
          const targetUrl = step.value || initialUrl || '';
          const resolved = resolveUrl(targetUrl);
          const validation = validateUrl(resolved);
          if (!validation.valid) {
            throw new Error(`URL not allowed: ${validation.reason}`);
          }
          await this.page.goto(resolved, {
            waitUntil: 'networkidle',
            timeout: step.timeoutMs || config.defaultTimeout,
          });
          this.log(`Navigated to: ${resolved}`);
          break;
        }

        case 'click': {
          if (!step.selector) throw new Error('Selector is required for click action');
          await this.page.click(step.selector, {
            timeout: step.timeoutMs || config.defaultTimeout,
          });
          this.log(`Clicked: ${step.selector}`);
          break;
        }

        case 'type': {
          if (!step.selector) throw new Error('Selector is required for type action');
          if (step.value === undefined) throw new Error('Value is required for type action');
          await this.page.fill(step.selector, step.value, {
            timeout: step.timeoutMs || config.defaultTimeout,
          });
          this.log(`Typed "${step.value}" into: ${step.selector}`);
          break;
        }

        case 'wait': {
          if (step.selector) {
            await this.page.waitForSelector(step.selector, {
              state: 'visible',
              timeout: step.timeoutMs || config.defaultTimeout,
            });
            this.log(`Waited for selector: ${step.selector}`);
          } else {
            await this.page.waitForTimeout(step.timeoutMs || 1000);
            this.log(`Waited ${step.timeoutMs || 1000}ms`);
          }
          break;
        }

        case 'assert_text': {
          if (!step.selector) throw new Error('Selector is required for assert_text action');
          const element = await this.page.$(step.selector);
          if (!element) throw new Error(`Element not found: ${step.selector}`);

          const text = await element.textContent();
          const normalizedText = (text || '').trim();
          const expectedValue = step.value || '';

          if (!normalizedText.includes(expectedValue)) {
            throw new Error(`Expected text "${expectedValue}" not found. Actual: "${normalizedText}"`);
          }
          this.log(`Assert text passed: "${expectedValue}" found in "${step.selector}"`);
          break;
        }

        case 'assert_visible': {
          if (!step.selector) throw new Error('Selector is required for assert_visible action');
          const isVisible = await this.page.isVisible(step.selector);
          if (!isVisible) {
            throw new Error(`Element not visible: ${step.selector}`);
          }
          this.log(`Assert visible passed: "${step.selector}" is visible`);
          break;
        }

        case 'hover': {
          if (!step.selector) throw new Error('Selector is required for hover action');
          await this.page.hover(step.selector, { timeout: step.timeoutMs || config.defaultTimeout });
          this.log(`Hovered: ${step.selector}`);
          break;
        }

        case 'double_click': {
          if (!step.selector) throw new Error('Selector is required for double_click action');
          await this.page.dblclick(step.selector, { timeout: step.timeoutMs || config.defaultTimeout });
          this.log(`Double-clicked: ${step.selector}`);
          break;
        }

        case 'drag': {
          if (!step.selector || !step.targetSelector) throw new Error('Both selector and targetSelector are required for drag');
          await this.page.dragAndDrop(step.selector, step.targetSelector, { timeout: step.timeoutMs || config.defaultTimeout });
          this.log(`Dragged ${step.selector} to ${step.targetSelector}`);
          break;
        }

        case 'select_option': {
          if (!step.selector) throw new Error('Selector is required for select_option');
          if (!step.value) throw new Error('Value is required for select_option');
          await this.page.selectOption(step.selector, step.value);
          this.log(`Selected "${step.value}" in: ${step.selector}`);
          break;
        }

        case 'press_key': {
          if (!step.value) throw new Error('Value (key name) is required for press_key');
          await this.page.keyboard.press(step.value);
          this.log(`Pressed key: ${step.value}`);
          break;
        }

        case 'evaluate': {
          if (!step.evaluateExpression) throw new Error('evaluateExpression is required for evaluate');
          const evalResult = await this.page.evaluate(step.evaluateExpression);
          this.log(`Evaluated: ${step.evaluateExpression} => ${JSON.stringify(evalResult).slice(0, 200)}`);
          (result as any).evaluateResult = evalResult;
          break;
        }

        default:
          throw new Error(`Unknown action: ${(step as any).action}`);
      }

      result.passed = true;
    } catch (error: any) {
      result.passed = false;
      result.error = error.message || String(error);
      this.log(`FAILED: ${step.action}${step.selector ? ` ${step.selector}` : ''} - ${result.error}`);
    }

    result.durationMs = Date.now() - start;

    const screenshotPath = await this.captureScreenshot(`step-${index}`);
    if (screenshotPath) {
      result.screenshotPath = screenshotPath;
    }

    return result;
  }

  async captureScreenshot(name: string): Promise<string | null> {
    if (!this.page) return null;

    const dir = config.screenshotDir;
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${name}-${uuidv4().slice(0, 8)}.png`;
    const filepath = path.join(dir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }

  async captureScreenshotBuffer(): Promise<Buffer | null> {
    if (!this.page) return null;
    return await this.page.screenshot({ fullPage: true });
  }

  async getPageContent(): Promise<string | null> {
    if (!this.page) return null;
    return await this.page.content();
  }

  log(message: string): void {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${message}`);
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getPage(): Page | null {
    return this.page;
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  async close(): Promise<void> {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch {
      // Ignore errors during cleanup
    }
    this.log('Browser closed');
  }
}
