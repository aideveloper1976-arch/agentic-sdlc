import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const UatActionSchema = z.object({
  type: z.enum([
    'goto',
    'click',
    'type',
    'clear',
    'select',
    'check',
    'uncheck',
    'press',
    'upload',
    'waitForText',
    'waitForSelector',
    'waitForUrl',
    'scroll',
  ]),
  selector: z.string().optional(),
  value: z.string().optional(),
  timeoutMs: z.number().positive().optional(),
});

const UatExpectationSchema = z.object({
  url: z.string().optional(),
  visibleText: z.array(z.string()).optional(),
  visibleSelectors: z.array(z.string()).optional(),
  forbiddenText: z.array(z.string()).optional(),
});

const UatStepSchema = z.object({
  stepId: z.string().min(1),
  action: UatActionSchema,
  expect: UatExpectationSchema,
});

const UatCaseSchema = z.object({
  tcId: z.string().min(1),
  title: z.string().min(1),
  journeySteps: z.array(z.string()).min(1),
  role: z.string().min(1),
  screen: z.string().min(1),
  steps: z.array(UatStepSchema).min(1),
});

export const RunUatBrowserSessionInputSchema = z.object({
  baseUrl: z.string().min(1),
  journeyId: z.string().min(1),
  role: z.object({
    name: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  browserMode: z.enum(['headless', 'headed']),
  seedProfile: z.string().min(1),
  outputDir: z.string().min(1),
  testCases: z.array(UatCaseSchema).min(1),
  recordVideo: z.boolean().optional(),
  takeScreenshots: z.boolean().optional(),
  trace: z.boolean().optional(),
  slowMoMs: z.number().nonnegative().optional(),
  forbiddenText: z.array(z.string()).optional(),
});

export function createUatToolDefinition(): Tool {
  return {
    name: 'run_uat_browser_session',
    description:
      'Run screen-level UAT in a real browser with per-step assertions, screenshots, and support for headless or visible-browser execution.',
    inputSchema: {
      type: 'object',
      properties: {
        baseUrl: { type: 'string', description: 'Base URL for the application under test' },
        journeyId: { type: 'string', description: 'Journey identifier such as J8' },
        role: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
          },
          required: ['name', 'username', 'password'],
        },
        browserMode: { type: 'string', enum: ['headless', 'headed'] },
        seedProfile: { type: 'string' },
        outputDir: { type: 'string' },
        recordVideo: { type: 'boolean' },
        takeScreenshots: { type: 'boolean' },
        trace: { type: 'boolean' },
        slowMoMs: { type: 'number' },
        forbiddenText: { type: 'array', items: { type: 'string' } },
        testCases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tcId: { type: 'string' },
              title: { type: 'string' },
              journeySteps: { type: 'array', items: { type: 'string' } },
              role: { type: 'string' },
              screen: { type: 'string' },
              steps: { type: 'array' },
            },
            required: ['tcId', 'title', 'journeySteps', 'role', 'screen', 'steps'],
          },
        },
      },
      required: ['baseUrl', 'journeyId', 'role', 'browserMode', 'seedProfile', 'outputDir', 'testCases'],
    },
  };
}
