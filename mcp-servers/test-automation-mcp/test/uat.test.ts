import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertUatExpectations,
  buildUatMarkdownReport,
  resolveUatExecutionOptions,
} from '../src/uat.js';

test('resolveUatExecutionOptions uses headless mode by default', () => {
  const result = resolveUatExecutionOptions(
    { browserMode: 'headless' },
    { headedAllowed: true, slowMoMs: 0, videoEnabled: false, traceEnabled: false },
  );

  assert.equal(result.headless, true);
  assert.equal(result.browserMode, 'headless');
});

test('resolveUatExecutionOptions rejects headed mode when not allowed', () => {
  assert.throws(
    () =>
      resolveUatExecutionOptions(
        { browserMode: 'headed' },
        { headedAllowed: false, slowMoMs: 0, videoEnabled: false, traceEnabled: false },
      ),
    /headed mode is not allowed/i,
  );
});

test('assertUatExpectations fails when forbidden text is visible', () => {
  const result = assertUatExpectations(
    {
      actualUrl: 'http://localhost:3000/training/my',
      visibleText: 'Sign in to continue',
      visibleSelectors: ['#login-email'],
    },
    {
      url: '/training/my',
      visibleText: ['Training Hub'],
      visibleSelectors: ['[data-testid="training-hub"]'],
      forbiddenText: ['Sign in', 'Access denied'],
    },
  );

  assert.equal(result.passed, false);
  assert.match(result.failures.join('\n'), /forbidden text/i);
});

test('assertUatExpectations passes when url text and selectors match', () => {
  const result = assertUatExpectations(
    {
      actualUrl: 'http://localhost:3000/settings/training',
      visibleText: 'Training Configuration Onboarding Fundamentals',
      visibleSelectors: ['[data-testid="training-config-table"]', 'button[role="switch"]'],
    },
    {
      url: '/settings/training',
      visibleText: ['Training Configuration', 'Onboarding Fundamentals'],
      visibleSelectors: ['[data-testid="training-config-table"]'],
      forbiddenText: ['Sign in', 'Access denied', '404'],
    },
  );

  assert.equal(result.passed, true);
  assert.deepEqual(result.failures, []);
});

test('buildUatMarkdownReport includes browser mode and step details', () => {
  const markdown = buildUatMarkdownReport({
    runId: 'uat-j8-001',
    journeyId: 'J8',
    browserMode: 'headed',
    summary: { totalTestCases: 1, totalSteps: 1, passedSteps: 1, failedSteps: 0 },
    results: [
      {
        tcId: 'TC-06',
        title: 'Organisation Admin opens Training Settings',
        role: 'Organisation Admin',
        screen: '/settings/training',
        result: 'passed',
        steps: [
          {
            stepId: 'TC-06.1',
            action: 'click settings training',
            expectedUrl: '/settings/training',
            actualUrl: 'http://localhost:3000/settings/training',
            expectedVisibleText: ['Training Configuration'],
            actualVisibleText: ['Training Configuration'],
            forbiddenText: ['Sign in'],
            screenshotPath: 'screenshots/TC-06-step-01-open-settings.png',
            result: 'passed',
            failures: [],
          },
        ],
      },
    ],
  });

  assert.match(markdown, /Browser Mode:\*\* headed/i);
  assert.match(markdown, /TC-06/i);
  assert.match(markdown, /TC-06-step-01-open-settings\.png/i);
});
