export type BrowserMode = 'headless' | 'headed';

export interface UatRuntimeOptions {
  headedAllowed: boolean;
  slowMoMs: number;
  videoEnabled: boolean;
  traceEnabled: boolean;
}

export interface UatExecutionRequest {
  browserMode: BrowserMode;
}

export interface UatExpectation {
  url?: string;
  visibleText?: string[];
  visibleSelectors?: string[];
  forbiddenText?: string[];
}

export interface UatObservedState {
  actualUrl: string;
  visibleText: string;
  visibleSelectors: string[];
}

export interface UatAssertionResult {
  passed: boolean;
  failures: string[];
}

export interface UatStepReport {
  stepId: string;
  action: string;
  expectedUrl: string;
  actualUrl: string;
  expectedVisibleText: string[];
  actualVisibleText: string[];
  forbiddenText: string[];
  screenshotPath: string;
  result: 'passed' | 'failed';
  failures: string[];
}

export interface UatCaseReport {
  tcId: string;
  title: string;
  role: string;
  screen: string;
  result: 'passed' | 'failed';
  steps: UatStepReport[];
}

export interface UatRunReport {
  runId: string;
  journeyId: string;
  browserMode: BrowserMode;
  summary: {
    totalTestCases: number;
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
  };
  results: UatCaseReport[];
}

export function resolveUatExecutionOptions(
  request: UatExecutionRequest,
  runtime: UatRuntimeOptions,
): UatRuntimeOptions & { browserMode: BrowserMode; headless: boolean } {
  if (request.browserMode === 'headed' && !runtime.headedAllowed) {
    throw new Error('Headed mode is not allowed by runtime configuration');
  }

  return {
    ...runtime,
    browserMode: request.browserMode,
    headless: request.browserMode === 'headless',
  };
}

export function assertUatExpectations(
  observed: UatObservedState,
  expected: UatExpectation,
): UatAssertionResult {
  const failures: string[] = [];
  const visibleText = observed.visibleText.toLowerCase();

  if (expected.url && !observed.actualUrl.includes(expected.url)) {
    failures.push(`Expected URL to include "${expected.url}" but got "${observed.actualUrl}"`);
  }

  for (const text of expected.visibleText ?? []) {
    if (!visibleText.includes(text.toLowerCase())) {
      failures.push(`Expected visible text "${text}" was not found`);
    }
  }

  for (const text of expected.forbiddenText ?? []) {
    if (visibleText.includes(text.toLowerCase())) {
      failures.push(`Forbidden text "${text}" was visible on screen`);
    }
  }

  for (const selector of expected.visibleSelectors ?? []) {
    if (!observed.visibleSelectors.includes(selector)) {
      failures.push(`Expected visible selector "${selector}" was not found`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export function buildUatMarkdownReport(report: UatRunReport): string {
  const lines: string[] = [];
  lines.push(`# UAT Browser Report: ${report.runId}`);
  lines.push('');
  lines.push(`- **Journey ID:** ${report.journeyId}`);
  lines.push(`- **Browser Mode:** ${report.browserMode}`);
  lines.push(`- **Total Test Cases:** ${report.summary.totalTestCases}`);
  lines.push(`- **Total Steps:** ${report.summary.totalSteps}`);
  lines.push(`- **Passed Steps:** ${report.summary.passedSteps}`);
  lines.push(`- **Failed Steps:** ${report.summary.failedSteps}`);
  lines.push('');
  lines.push('## Test Cases');
  lines.push('');
  lines.push('| TC ID | Role | Screen | Result |');
  lines.push('|------|------|--------|--------|');
  for (const result of report.results) {
    lines.push(`| ${result.tcId} | ${result.role} | ${result.screen} | ${result.result === 'passed' ? '✅' : '❌'} |`);
  }
  lines.push('');

  for (const result of report.results) {
    lines.push(`## ${result.tcId}: ${result.title}`);
    lines.push('');
    lines.push(`- **Role:** ${result.role}`);
    lines.push(`- **Screen:** ${result.screen}`);
    lines.push(`- **Result:** ${result.result}`);
    lines.push('');
    lines.push('| Step ID | Action | Expected URL | Actual URL | Expected Text | Actual Text | Screenshot | Result |');
    lines.push('|--------|--------|--------------|------------|---------------|-------------|------------|--------|');
    for (const step of result.steps) {
      lines.push(
        `| ${step.stepId} | ${step.action} | ${step.expectedUrl} | ${step.actualUrl} | ${step.expectedVisibleText.join(', ')} | ${step.actualVisibleText.join(', ')} | ${step.screenshotPath} | ${step.result === 'passed' ? '✅' : '❌'} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
