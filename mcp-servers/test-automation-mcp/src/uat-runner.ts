import fs from 'fs';
import path from 'path';

import { config, resolveUrl, validateUrl } from './config.js';
import { PlaywrightManager } from './playwright.js';
import {
  assertUatExpectations,
  buildUatMarkdownReport,
  resolveUatExecutionOptions,
  type BrowserMode,
  type UatCaseReport,
  type UatRunReport,
  type UatStepReport,
} from './uat.js';
import { buildUatRuntimeConfig } from './uat-config.js';
import { RunUatBrowserSessionInputSchema } from './uat-tool.js';

type RunUatBrowserSessionInput = ReturnType<typeof RunUatBrowserSessionInputSchema['parse']>;

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function captureVisibleBodyText(manager: PlaywrightManager): Promise<string> {
  const page = manager.getPage();
  if (!page) return '';
  return page.locator('body').innerText().catch(() => '');
}

async function captureVisibleSelectors(manager: PlaywrightManager, selectors: string[]): Promise<string[]> {
  const page = manager.getPage();
  if (!page) return [];
  const found: string[] = [];
  for (const selector of selectors) {
    const visible = await page.locator(selector).first().isVisible().catch(() => false);
    if (visible) found.push(selector);
  }
  return found;
}

async function executeBrowserAction(manager: PlaywrightManager, action: { type: string; selector?: string; value?: string; timeoutMs?: number }) {
  const page = manager.getPage();
  if (!page) throw new Error('Browser page not available');
  const timeout = action.timeoutMs ?? config.defaultTimeout;

  switch (action.type) {
    case 'goto':
      await page.goto(resolveUrl(action.value || ''), { waitUntil: 'networkidle', timeout });
      return `goto ${action.value || ''}`;
    case 'click':
      if (!action.selector) throw new Error('Selector is required for click');
      await page.locator(action.selector).first().click({ timeout });
      return `click ${action.selector}`;
    case 'type':
      if (!action.selector) throw new Error('Selector is required for type');
      await page.locator(action.selector).first().fill(action.value || '', { timeout });
      return `type ${action.selector}`;
    case 'clear':
      if (!action.selector) throw new Error('Selector is required for clear');
      await page.locator(action.selector).first().fill('', { timeout });
      return `clear ${action.selector}`;
    case 'select':
      if (!action.selector || action.value === undefined) throw new Error('Selector and value are required for select');
      await page.locator(action.selector).first().selectOption(action.value, { timeout });
      return `select ${action.selector}`;
    case 'check':
      if (!action.selector) throw new Error('Selector is required for check');
      await page.locator(action.selector).first().check({ timeout });
      return `check ${action.selector}`;
    case 'uncheck':
      if (!action.selector) throw new Error('Selector is required for uncheck');
      await page.locator(action.selector).first().uncheck({ timeout });
      return `uncheck ${action.selector}`;
    case 'press':
      if (!action.selector || !action.value) throw new Error('Selector and value are required for press');
      await page.locator(action.selector).first().press(action.value, { timeout });
      return `press ${action.value} on ${action.selector}`;
    case 'upload':
      if (!action.selector || !action.value) throw new Error('Selector and value are required for upload');
      await page.locator(action.selector).first().setInputFiles(action.value, { timeout });
      return `upload ${action.selector}`;
    case 'waitForText':
      if (!action.value) throw new Error('Value is required for waitForText');
      await page.getByText(action.value, { exact: false }).waitFor({ timeout });
      return `waitForText ${action.value}`;
    case 'waitForSelector':
      if (!action.selector) throw new Error('Selector is required for waitForSelector');
      await page.locator(action.selector).first().waitFor({ state: 'visible', timeout });
      return `waitForSelector ${action.selector}`;
    case 'waitForUrl':
      if (!action.value) throw new Error('Value is required for waitForUrl');
      await page.waitForURL((url) => url.toString().includes(action.value || ''), { timeout });
      return `waitForUrl ${action.value}`;
    case 'scroll':
      await page.mouse.wheel(0, Number.parseInt(action.value || '800', 10));
      return 'scroll';
    default:
      throw new Error(`Unsupported UAT action: ${action.type}`);
  }
}

export async function runUatBrowserSession(rawInput: unknown) {
  const input = RunUatBrowserSessionInputSchema.parse(rawInput) as RunUatBrowserSessionInput;
  const validation = validateUrl(resolveUrl(input.baseUrl));
  if (!validation.valid) {
    throw new Error(`URL not allowed: ${validation.reason}`);
  }

  const runtime = buildUatRuntimeConfig(process.env);
  const execution = resolveUatExecutionOptions({ browserMode: input.browserMode }, runtime);

  const runId = `uat-${sanitizeName(input.journeyId)}-${Date.now()}`;
  const baseDir = path.resolve(input.outputDir, 'runs', runId);
  const screenshotDir = path.join(baseDir, 'screenshots');
  const videoDir = path.join(baseDir, 'video');
  const traceDir = path.join(baseDir, 'trace');
  const domDir = path.join(baseDir, 'dom');
  for (const dir of [baseDir, screenshotDir, videoDir, traceDir, domDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const manager = new PlaywrightManager();
  const caseReports: UatCaseReport[] = [];
  let totalSteps = 0;
  let passedSteps = 0;
  let failedSteps = 0;

  try {
    await manager.launch({
      headless: execution.headless,
      slowMoMs: execution.slowMoMs,
      recordVideoDir: input.recordVideo ? videoDir : undefined,
    });

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
          actionSummary = await executeBrowserAction(manager, step.action);
          const page = manager.getPage();
          actualUrl = page?.url() || '';
          actualText = await captureVisibleBodyText(manager);
          const visibleSelectors = await captureVisibleSelectors(manager, step.expect.visibleSelectors ?? []);
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

          const screenshotName = `${sanitizeName(testCase.tcId)}-${sanitizeName(step.stepId)}.png`;
          screenshotPath = path.join(screenshotDir, screenshotName);
          await page?.screenshot({ path: screenshotPath, fullPage: true });

          const domPath = path.join(domDir, `${sanitizeName(testCase.tcId)}-${sanitizeName(step.stepId)}.html`);
          fs.writeFileSync(domPath, await (page?.content() ?? Promise.resolve('')));

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
    await manager.close();
  }

  const report: UatRunReport = {
    runId,
    journeyId: input.journeyId,
    browserMode: input.browserMode as BrowserMode,
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
    summary: report.summary,
    artifacts: {
      reportJson,
      reportMd,
      screenshotDir,
      videoDir: input.recordVideo ? videoDir : null,
      traceDir: input.trace ? traceDir : null,
      domDir,
    },
    results: caseReports,
  };
}
