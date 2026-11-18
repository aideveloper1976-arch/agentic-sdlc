import test from 'node:test';
import assert from 'node:assert/strict';

import { RunUatBrowserSessionInputSchema, createUatToolDefinition } from '../src/uat-tool.js';

test('createUatToolDefinition exposes run_uat_browser_session', () => {
  const tool = createUatToolDefinition();

  assert.equal(tool.name, 'run_uat_browser_session');
  assert.match(tool.description || '', /screen-level uat/i);
});

test('RunUatBrowserSessionInputSchema validates required fields', () => {
  const parsed = RunUatBrowserSessionInputSchema.parse({
    baseUrl: 'http://localhost:3000',
    journeyId: 'J8',
    role: {
      name: 'Organisation Admin',
      username: 'org-admin@acme.local',
      password: 'example-password',
    },
    browserMode: 'headed',
    seedProfile: 'training-module-j8',
    outputDir: 'docs/product/evidence/uat',
    testCases: [
      {
        tcId: 'TC-06',
        title: 'Open training settings',
        journeySteps: ['J8.6'],
        role: 'Organisation Admin',
        screen: '/settings/training',
        steps: [
          {
            stepId: 'TC-06.1',
            action: { type: 'goto', value: '/settings/training' },
            expect: {
              url: '/settings/training',
              visibleText: ['Training Configuration'],
              forbiddenText: ['Sign in'],
            },
          },
        ],
      },
    ],
  });

  assert.equal(parsed.browserMode, 'headed');
  assert.equal(parsed.testCases[0]?.steps[0]?.expect.url, '/settings/training');
});
