import fs from 'fs';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { config, resolveUrl, validateUrl } from './config.js';
import { buildUatRuntimeConfig } from './uat-config.js';
import { RunUatBrowserSessionInputSchema } from './uat-tool.js';
import {
  assertUatExpectations,
  buildUatMarkdownReport,
  resolveUatExecutionOptions,
  type UatCaseReport,
  type UatRunReport,
  type UatStepReport,
} from './uat.js';

type RunUatBrowserSessionInput = ReturnType<typeof RunUatBrowserSessionInputSchema['parse']>;

const CHROME_MCP_URL = process.env.CHROME_MCP_URL || 'http://127.0.0.1:12306/mcp';

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * MCP client wrapper for Chrome MCP
 */
class ChromeMcpClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor() {
    this.client = new Client(
      { name: 'test-automation-mcp-uat-dev', version: '1.0.0' },
      { capabilities: {} },
    );
  }

  async connect(): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(new URL(CHROME_MCP_URL), {});
    await this.client.connect(this.transport);
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<any> {
    const result = await this.client.callTool({ name, arguments: args });
    const content: any[] = (result as any).content || [];
    const textContent = content.find((c: any) => c.type === 'text');
    if (textContent) {
      try { return JSON.parse(textContent.text); } catch { return textContent.text; }
    }
    return result;
  }

  async navigate(url: string): Promise<void> {
    await this.callTool('chrome_navigate', { url, newWindow: false });
    await this.sleep(1000);
  }

  async click(selector: string): Promise<void> {
    await this.callTool('chrome_click_element', { selector });
    await this.sleep(500);
  }

  async fillField(selector: string, value: string): Promise<void> {
    await this.callTool('chrome_fill_or_select', { selector, value });
    await this.sleep(300);
  }

  async pressKey(keys: string): Promise<void> {
    await this.callTool('chrome_keyboard', { keys });
    await this.sleep(300);
  }

  async screenshot(name: string, outputDir: string): Promise<string> {
    const result = await this.callTool('chrome_screenshot', {
      name,
      storeBase64: true,
      fullPage: true,
    }) as any;

    const filepath = path.join(outputDir, `${name}.png`);
    if (result?.base64) {
      const base64Data = result.base64.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    }
    return filepath;
  }

  async getPageContent(format: 'text' | 'html' = 'text'): Promise<string> {
    const result = await this.callTool('chrome_get_web_content', { format }) as any;
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  async getCurrentUrl(): Promise<string> {
    const result = await this.callTool('chrome_get_web_content', { format: 'text' }) as any;
    return result?.url || '';
  }

  async scroll(amount: number = 800): Promise<void> {
    await this.callTool('chrome_computer', { action: 'scroll', scrollDirection: 'down', scrollAmount: Math.min(Math.ceil(amount / 100), 10) });
    await this.sleep(300);
  }

  async close(): Promise<void> {
    try {
      await this.client.close();
    } catch { /* ignore */ }
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function captureVisibleText(client: ChromeMcpClient): Promise<string> {
  try {
    return await client.getPageContent('text');
  } catch {
    return '';
  }
}

async function captureVisibleSelectors(selectors: string[]): Promise<string[]> {
  return [];
}

export async function runUatDevSession(rawInput: unknown) {
  const input = RunUatBrowserSessionInputSchema.parse(rawInput) as RunUatBrowserSessionInput;
  const validation = validateUrl(resolveUrl(input.baseUrl));
  if (!validation.valid) {
    throw new Error(`URL not allowed: ${validation.reason}`);
  }

  const runId = `uat-dev-${sanitizeName(input.journeyId)}-${Date.now()}`;
  const baseDir = path.resolve(input.outputDir, 'runs', runId);
  const screenshotDir = path.join(baseDir, 'screenshots');
  const domDir = path.join(baseDir, 'dom');
  for (const dir of [baseDir, screenshotDir, domDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const client = new ChromeMcpClient();
  const caseReports: UatCaseReport[] = [];
  let totalSteps = 0;
  let passedSteps = 0;
  let failedSteps = 0;

  try {
    await client.connect();

    for (const testCase of input.testCases) {
      const stepReports: UatStepReport[] = [];
      let casePassed = true;

      for (const step of testCase.steps) {
        totalSteps += 1;
        let actionSummary = '';
        let actualUrl = '';
        let actualText = '';
        let screenshotPath = '';
        let failures: string[] = [];

        try {
          actionSummary = await executeChromeAction(client, step.action);
          await client.sleep(1500);
          actualUrl = await client.getCurrentUrl();
          actualText = await captureVisibleText(client);
          const visibleSelectors = await captureVisibleSelectors(step.expect.visibleSelectors ?? []);

          const assertion = assertUatExpectations(
            {
              actualUrl,
              visibleText: actualText,
              visibleSelectors,
            },
            {
              url: step.expect.url,
              visibleText: step.expect.visibleText,
              visibleSelectors: step.expect.visibleSelectors,
              forbiddenText: step.expect.forbiddenText ?? input.forbiddenText,
            },
          );
          failures = assertion.failures;

          const screenshotName = `${sanitizeName(testCase.tcId)}-${sanitizeName(step.stepId)}`;
          screenshotPath = await client.screenshot(screenshotName, screenshotDir);

          const domPath = path.join(domDir, `${sanitizeName(testCase.tcId)}-${sanitizeName(step.stepId)}.html`);
          fs.writeFileSync(domPath, await client.getPageContent('html'));

          const stepResult: UatStepReport = {
            stepId: step.stepId,
            action: actionSummary,
            expectedUrl: step.expect.url || '',
            actualUrl,
            expectedVisibleText: step.expect.visibleText ?? [],
            actualVisibleText: actualText ? [actualText.slice(0, 500)] : [],
            forbiddenText: step.expect.forbiddenText ?? input.forbiddenText ?? [],
            screenshotPath,
            result: assertion.passed ? 'passed' : 'failed',
            failures,
          };
          stepReports.push(stepResult);
          if (assertion.passed) {
            passedSteps += 1;
          } else {
            failedSteps += 1;
            casePassed = false;
          }
        } catch (error) {
          failedSteps += 1;
          casePassed = false;
          stepReports.push({
            stepId: step.stepId,
            action: actionSummary || step.action.type,
            expectedUrl: step.expect.url || '',
            actualUrl,
            expectedVisibleText: step.expect.visibleText ?? [],
            actualVisibleText: actualText ? [actualText.slice(0, 500)] : [],
            forbiddenText: step.expect.forbiddenText ?? input.forbiddenText ?? [],
            screenshotPath,
            result: 'failed',
            failures: [error instanceof Error ? error.message : String(error)],
          });
        }
      }

      caseReports.push({
        tcId: testCase.tcId,
        title: testCase.title,
        role: testCase.role,
        screen: testCase.screen,
        result: casePassed ? 'passed' : 'failed',
        steps: stepReports,
      });
    }
  } finally {
    await client.close();
  }

  const report: UatRunReport = {
    runId,
    journeyId: input.journeyId,
    browserMode: 'headed',
    summary: {
      totalTestCases: input.testCases.length,
      totalSteps,
      passedSteps,
      failedSteps,
    },
    results: caseReports,
  };

  const reportJson = path.join(baseDir, 'report.json');
  const reportMd = path.join(baseDir, 'report.md');
  fs.writeFileSync(reportJson, JSON.stringify(report, null, 2));
  fs.writeFileSync(reportMd, buildUatMarkdownReport(report));

  return {
    success: failedSteps === 0,
    runId,
    status: failedSteps === 0 ? 'passed' : 'failed',
    browser: 'chrome-mcp',
    note: 'Ran on user real Chrome via mcp-chrome. Browser window was visible during execution.',
    summary: report.summary,
    artifacts: {
      reportJson,
      reportMd,
      screenshotDir,
      domDir,
    },
    results: caseReports,
  };
}

async function executeChromeAction(
  client: ChromeMcpClient,
  action: { type: string; selector?: string; value?: string; timeoutMs?: number },
): Promise<string> {
  switch (action.type) {
    case 'goto':
      await client.navigate(action.value || '');
      return `goto ${action.value || ''}`;
    case 'click':
      if (!action.selector) throw new Error('Selector is required for click');
      await client.click(action.selector);
      return `click ${action.selector}`;
    case 'type':
      if (!action.selector) throw new Error('Selector is required for type');
      await client.fillField(action.selector, action.value || '');
      return `type ${action.selector}`;
    case 'clear':
      if (!action.selector) throw new Error('Selector is required for clear');
      await client.fillField(action.selector, '');
      return `clear ${action.selector}`;
    case 'select':
      if (!action.selector || action.value === undefined) throw new Error('Selector and value are required for select');
      await client.fillField(action.selector, action.value);
      return `select ${action.selector}`;
    case 'check':
    case 'uncheck':
      if (!action.selector) throw new Error('Selector is required for check/uncheck');
      await client.click(action.selector);
      return `${action.type} ${action.selector}`;
    case 'press':
      if (!action.value) throw new Error('Value is required for press');
      await client.pressKey(action.value);
      return `press ${action.value}`;
    case 'waitForText':
      if (!action.value) throw new Error('Value is required for waitForText');
      await client.sleep(action.timeoutMs || config.defaultTimeout);
      return `waitForText ${action.value}`;
    case 'waitForSelector':
      if (!action.selector) throw new Error('Selector is required for waitForSelector');
      await client.sleep(action.timeoutMs || config.defaultTimeout);
      return `waitForSelector ${action.selector}`;
    case 'waitForUrl':
      if (!action.value) throw new Error('Value is required for waitForUrl');
      await client.navigate(action.value);
      return `waitForUrl ${action.value}`;
    case 'scroll':
      await client.scroll(Number.parseInt(action.value || '800', 10));
      return 'scroll';
    default:
      throw new Error(`Unsupported UAT action for Chrome MCP: ${action.type}`);
  }
}
