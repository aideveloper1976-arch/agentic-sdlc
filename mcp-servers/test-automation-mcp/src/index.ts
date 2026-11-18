import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { PlaywrightManager } from './playwright.js';
import { runVisualRegression, captureScreenshot as captureVisualScreenshot } from './visual.js';
import { checkAccessibility } from './accessibility.js';
import { executeUserFlow } from './flows.js';
import { saveEvidence, generateTestReport, collectExistingEvidence } from './evidence.js';
import { resolveUrl, validateUrl } from './config.js';
import type { UIAnalysis } from './types.js';
import { createUatToolDefinition, RunUatBrowserSessionInputSchema } from './uat-tool.js';
import { runUatBrowserSession } from './uat-runner.js';
import { runUatDevSession } from './uat-dev-runner.js';
import { snapshotPage } from './snapshot.js';
import { inspectNetwork, getInspectedNetworkRequest } from './network.js';
import { getConsoleLogs } from './console.js';
import { verifyElement, verifyText, verifyValue } from './verify.js';
import { highlight, startTrace, stopTrace } from './devtools.js';

const TestStepSchema = z.object({
  action: z.enum(['goto', 'click', 'type', 'wait', 'assert_text', 'assert_visible', 'hover', 'drag', 'select_option', 'press_key', 'fill_form', 'double_click', 'evaluate']),
  selector: z.string().optional(),
  value: z.string().optional(),
  targetSelector: z.string().optional(),
  evaluateExpression: z.string().optional(),
  timeoutMs: z.number().positive().optional(),
});

const RunE2EInputSchema = z.object({
  url: z.string().min(1),
  testName: z.string().min(1),
  steps: z.array(TestStepSchema).min(1),
});

const CaptureScreenshotInputSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
});

const VisualRegressionInputSchema = z.object({
  url: z.string().min(1),
  baselineImagePath: z.string().min(1),
});

const AnalyzeUIInputSchema = z.object({
  url: z.string().min(1),
});

const CheckAccessibilityInputSchema = z.object({
  url: z.string().min(1),
});

const TestUserFlowInputSchema = z.object({
  url: z.string().min(1),
  flowName: z.string().min(1),
  steps: z.array(TestStepSchema).min(1),
});

const GenerateReportInputSchema = z.object({
  testName: z.string().min(1),
});

const SaveEvidenceInputSchema = z.object({
  entityId: z.string().min(1),
  testName: z.string().min(1),
  result: z.enum(['passed', 'failed', 'error']),
  evidencePaths: z.array(z.string()),
  summary: z.string().min(1),
});

const SnapshotPageInputSchema = z.object({
  url: z.string().min(1),
  selector: z.string().optional(),
});

const InspectNetworkInputSchema = z.object({
  url: z.string().min(1),
  includeStatic: z.boolean().optional(),
  filter: z.string().optional(),
});

const InspectNetworkRequestInputSchema = z.object({
  index: z.number().int().positive(),
});

const GetConsoleLogsInputSchema = z.object({
  url: z.string().min(1),
  level: z.enum(['debug', 'info', 'warning', 'error']).optional(),
});

const VerifyElementInputSchema = z.object({
  role: z.string().min(1),
  accessibleName: z.string().min(1),
});

const VerifyTextInputSchema = z.object({
  text: z.string().min(1),
});

const VerifyValueInputSchema = z.object({
  selector: z.string().min(1),
  value: z.string().min(1),
  type: z.string().optional(),
});

const DebugHighlightInputSchema = z.object({
  selector: z.string().min(1),
  style: z.string().optional(),
});

const tools: Tool[] = [
  createUatToolDefinition(),
  {
    name: 'run_uat_dev_session',
    description: 'Run UAT in DEV mode using the user\'s real Chrome browser (via mcp-chrome). Browser window is visible so you can see test execution live. Requires mcp-chrome extension to be connected. Use this instead of run_uat_browser_session for interactive dev/UAT debugging.',
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
        browserMode: { type: 'string', enum: ['headless', 'headed'], description: 'Ignored — always uses real Chrome. Kept for API compatibility.' },
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
  },
  {
    name: 'run_e2e_test',
    description: 'Execute an end-to-end browser test with sequential steps. Supports navigation, clicks, typing, waits, and assertions.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to (e.g. http://localhost:3000)' },
        testName: { type: 'string', description: 'Unique name for this test' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['goto', 'click', 'type', 'wait', 'assert_text', 'assert_visible'] },
              selector: { type: 'string', description: 'CSS selector for the element' },
              value: { type: 'string', description: 'Value to type or text to assert' },
              timeoutMs: { type: 'number', description: 'Timeout in milliseconds for this step' },
            },
            required: ['action'],
          },
          description: 'Sequential test steps',
        },
      },
      required: ['url', 'testName', 'steps'],
    },
  },
  {
    name: 'capture_screenshot',
    description: 'Navigate to a URL and capture a full-page screenshot saved to evidence storage.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to capture' },
        name: { type: 'string', description: 'Name for the screenshot file' },
      },
      required: ['url', 'name'],
    },
  },
  {
    name: 'run_visual_regression',
    description: 'Compare a current page screenshot against a baseline image and report pixel differences.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to capture current state' },
        baselineImagePath: { type: 'string', description: 'File path to the baseline PNG image' },
      },
      required: ['url', 'baselineImagePath'],
    },
  },
  {
    name: 'analyze_ui',
    description: 'Extract UI elements (buttons, forms, navigation, inputs) from a page and identify missing labels or inconsistencies.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to analyze' },
      },
      required: ['url'],
    },
  },
  {
    name: 'check_accessibility',
    description: 'Run axe-core accessibility analysis on a page and return violations with severity and recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to check' },
      },
      required: ['url'],
    },
  },
  {
    name: 'test_user_flow',
    description: 'Execute a multi-step user flow with UX evidence capture. Similar to run_e2e_test but saves enriched UX evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Starting URL' },
        flowName: { type: 'string', description: 'Name for this user flow' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['goto', 'click', 'type', 'wait', 'assert_text', 'assert_visible'] },
              selector: { type: 'string' },
              value: { type: 'string' },
              timeoutMs: { type: 'number' },
            },
            required: ['action'],
          },
          description: 'Sequential flow steps',
        },
      },
      required: ['url', 'flowName', 'steps'],
    },
  },
  {
    name: 'generate_test_report',
    description: 'Aggregate all test results, screenshots, and logs into a structured markdown report saved to evidence storage.',
    inputSchema: {
      type: 'object',
      properties: {
        testName: { type: 'string', description: 'Name of the test suite to report on' },
      },
      required: ['testName'],
    },
  },
  {
    name: 'save_test_evidence',
    description: 'Persist structured test evidence (JSON + markdown) linked to a traceability entity ID.',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Traceability entity ID (e.g. Story ID, Ticket ID)' },
        testName: { type: 'string', description: 'Name of the test' },
        result: { type: 'string', enum: ['passed', 'failed', 'error'] },
        evidencePaths: { type: 'array', items: { type: 'string' }, description: 'Paths to evidence files' },
        summary: { type: 'string', description: 'Human-readable test summary' },
      },
      required: ['entityId', 'testName', 'result', 'evidencePaths', 'summary'],
    },
  },
  {
    name: 'snapshot_page',
    description: 'Capture accessibility snapshot of the current page as a structured tree. Better than screenshot for understanding page structure.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to before snapshot' },
        selector: { type: 'string', description: 'CSS selector to scope snapshot to a specific element' },
      },
      required: ['url'],
    },
  },
  {
    name: 'inspect_network',
    description: 'Capture all network requests and responses for a page. Navigate to URL and get full request/response details.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to for network capture' },
        includeStatic: { type: 'boolean', description: 'Include static resources (images, fonts, etc.). Default: false' },
        filter: { type: 'string', description: 'Regex to filter requests (e.g., "/api/.*user")' },
      },
      required: ['url'],
    },
  },
  {
    name: 'inspect_network_request',
    description: 'Get full details (headers and body) of a single network request by index from inspect_network output.',
    inputSchema: {
      type: 'object',
      properties: {
        index: { type: 'number', description: '1-based index of the request from inspect_network output' },
      },
      required: ['index'],
    },
  },
  {
    name: 'get_console_logs',
    description: 'Capture browser console messages (log, warn, error, info, debug). Navigate to URL and collect all console output.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' },
        level: { type: 'string', enum: ['debug', 'info', 'warning', 'error'], description: 'Minimum console level. Default: info' },
      },
      required: ['url'],
    },
  },
  {
    name: 'verify_element',
    description: 'Verify an element with a given role and accessible name is visible on the page.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', description: 'ARIA role of the element (e.g., "button", "textbox", "heading")' },
        accessibleName: { type: 'string', description: 'Accessible name of the element' },
      },
      required: ['role', 'accessibleName'],
    },
  },
  {
    name: 'verify_text',
    description: 'Verify specific text is visible on the current page. Prefer verify_element when possible.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to verify is visible on the page' },
      },
      required: ['text'],
    },
  },
  {
    name: 'verify_value',
    description: 'Verify the value of a form element (input, select, checkbox, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector for the element' },
        value: { type: 'string', description: 'Expected value. For checkbox use "true" or "false"' },
        type: { type: 'string', description: 'Element type: "textbox", "checkbox", "combobox", "option"' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'debug_highlight',
    description: 'Show a persistent highlight overlay around an element on the page for visual debugging.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector for the element to highlight' },
        style: { type: 'string', description: 'Custom CSS style for the highlight overlay' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'debug_trace_start',
    description: 'Start Playwright trace recording for the current page. Browser must already be launched. Use debug_trace_stop to end.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'debug_trace_stop',
    description: 'Stop Playwright trace recording and save the trace file.',
    inputSchema: { type: 'object', properties: {} },
  },
];

let traceManager: PlaywrightManager | null = null;

function formatResponse(data: unknown): { content: { type: string; text: string }[] } {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function formatError(error: unknown): { content: { type: string; text: string }[] } {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: JSON.stringify({ success: false, error: message }, null, 2) }],
  };
}

const server = new Server(
  {
    name: 'test-automation-mcp',
    version: '1.0.0',
  },
  {
    capabilities: { tools: {} },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'run_e2e_test': {
        const { url, testName, steps } = RunE2EInputSchema.parse(args);

        const validation = validateUrl(resolveUrl(url));
        if (!validation.valid) {
          return formatResponse({
            success: false,
            testName,
            result: 'error',
            error: validation.reason,
          });
        }

        const manager = new PlaywrightManager();
        const start = Date.now();

        try {
          await manager.launch();
          const { results, screenshots } = await manager.executeSteps(url, steps);
          const logs = manager.getLogs();
          const durationMs = Date.now() - start;

          const allPassed = results.every(r => r.passed);

          return formatResponse({
            success: allPassed,
            testName,
            result: allPassed ? 'passed' : 'failed',
            steps: results,
            screenshots,
            logs,
            durationMs,
          });
        } finally {
          await manager.close();
        }
      }

      case 'run_uat_browser_session': {
        const input = RunUatBrowserSessionInputSchema.parse(args);
        const result = await runUatBrowserSession(input);
        return formatResponse(result);
      }

      case 'run_uat_dev_session': {
        const input = RunUatBrowserSessionInputSchema.parse(args);
        const result = await runUatDevSession(input);
        return formatResponse(result);
      }

      case 'capture_screenshot': {
        const { url, name } = CaptureScreenshotInputSchema.parse(args);
        const { valid, reason } = validateUrl(resolveUrl(url));
        if (!valid) {
          return formatResponse({ success: false, error: reason });
        }

        const path = await captureVisualScreenshot(url, name);
        return formatResponse({
          success: true,
          url,
          name,
          screenshotPath: path,
        });
      }

      case 'run_visual_regression': {
        const { url, baselineImagePath } = VisualRegressionInputSchema.parse(args);
        const { valid, reason } = validateUrl(resolveUrl(url));
        if (!valid) {
          return formatResponse({ success: false, error: reason });
        }

        const result = await runVisualRegression(url, baselineImagePath);
        return formatResponse({
          success: result.passed,
          ...result,
        });
      }

      case 'analyze_ui': {
        const { url } = AnalyzeUIInputSchema.parse(args);
        const { valid, reason } = validateUrl(resolveUrl(url));
        if (!valid) {
          return formatResponse({ success: false, error: reason });
        }

        const analysis = await analyzePageUI(url);
        return formatResponse({
          success: true,
          ...analysis,
        });
      }

      case 'check_accessibility': {
        const { url } = CheckAccessibilityInputSchema.parse(args);
        const { valid, reason } = validateUrl(resolveUrl(url));
        if (!valid) {
          return formatResponse({ success: false, error: reason });
        }

        const result = await checkAccessibility(url);
        return formatResponse({
          success: true,
          ...result,
        });
      }

      case 'test_user_flow': {
        const { url, flowName, steps } = TestUserFlowInputSchema.parse(args);

        const flowResult = await executeUserFlow(url, flowName, steps);
        return formatResponse({
          success: flowResult.success,
          flowName: flowResult.flowName,
          url: flowResult.url,
          steps: flowResult.steps,
          screenshots: flowResult.screenshots,
          logs: flowResult.logs,
          durationMs: flowResult.durationMs,
          evidencePath: flowResult.evidencePath,
        });
      }

      case 'generate_test_report': {
        const { testName } = GenerateReportInputSchema.parse(args);

        const existingResults = collectExistingEvidence(testName);

        if (existingResults.length === 0) {
          return formatResponse({
            success: false,
            error: `No test results found for "${testName}". Run tests first.`,
          });
        }

        const report = generateTestReport(testName, existingResults);
        return formatResponse({
          success: true,
          testName: report.testName,
          totalTests: report.totalTests,
          passed: report.passed,
          failed: report.failed,
          reportPath: report.reportPath,
          timestamp: report.timestamp,
        });
      }

      case 'save_test_evidence': {
        const input = SaveEvidenceInputSchema.parse(args);

        const entry = {
          entityId: input.entityId,
          testName: input.testName,
          result: input.result,
          evidencePaths: input.evidencePaths,
          summary: input.summary,
          timestamp: new Date().toISOString(),
          durationMs: 0,
        };

        const savedPath = saveEvidence(entry);
        return formatResponse({
          success: true,
          entityId: input.entityId,
          testName: input.testName,
          result: input.result,
          evidencePaths: input.evidencePaths,
          summary: input.summary,
          savedPath,
          timestamp: entry.timestamp,
        });
      }

      case 'snapshot_page': {
        const { url, selector } = SnapshotPageInputSchema.parse(args);
        const { valid, reason } = validateUrl(resolveUrl(url));
        if (!valid) return formatResponse({ success: false, error: reason });

        const snapManager = new PlaywrightManager();
        try {
          const snapshot = await snapshotPage(snapManager, url, selector);
          return formatResponse({ success: true, ...snapshot });
        } finally {
          await snapManager.close();
        }
      }

      case 'inspect_network': {
        const { url, includeStatic, filter } = InspectNetworkInputSchema.parse(args);
        const { valid, reason } = validateUrl(resolveUrl(url));
        if (!valid) return formatResponse({ success: false, error: reason });

        const netManager = new PlaywrightManager();
        try {
          const network = await inspectNetwork(netManager, url, includeStatic, filter);
          return formatResponse({ success: true, ...network });
        } finally {
          await netManager.close();
        }
      }

      case 'inspect_network_request': {
        const { index } = InspectNetworkRequestInputSchema.parse(args);
        const requestData = getInspectedNetworkRequest(index);
        return formatResponse({ success: true, request: requestData });
      }

      case 'get_console_logs': {
        const { url, level } = GetConsoleLogsInputSchema.parse(args);
        const { valid, reason } = validateUrl(resolveUrl(url));
        if (!valid) return formatResponse({ success: false, error: reason });

        const conManager = new PlaywrightManager();
        try {
          const logs = await getConsoleLogs(conManager, url, level);
          return formatResponse({ success: true, ...logs });
        } finally {
          await conManager.close();
        }
      }

      case 'verify_element': {
        const { role, accessibleName } = VerifyElementInputSchema.parse(args);
        const verManager = new PlaywrightManager();
        try {
          await verManager.launch();
          const result = await verifyElement(verManager, role, accessibleName);
          return formatResponse(result);
        } finally {
          await verManager.close();
        }
      }

      case 'verify_text': {
        const { text } = VerifyTextInputSchema.parse(args);
        const txtManager = new PlaywrightManager();
        try {
          await txtManager.launch();
          const result = await verifyText(txtManager, text);
          return formatResponse(result);
        } finally {
          await txtManager.close();
        }
      }

      case 'verify_value': {
        const { selector, value, type } = VerifyValueInputSchema.parse(args);
        const valManager = new PlaywrightManager();
        try {
          await valManager.launch();
          const result = await verifyValue(valManager, selector, value, type);
          return formatResponse(result);
        } finally {
          await valManager.close();
        }
      }

      case 'debug_highlight': {
        const { selector, style } = DebugHighlightInputSchema.parse(args);
        const dbgManager = new PlaywrightManager();
        try {
          await dbgManager.launch();
          const result = await highlight(dbgManager, selector, style);
          return formatResponse(result);
        } finally {
          await dbgManager.close();
        }
      }

      case 'debug_trace_start': {
        traceManager = new PlaywrightManager();
        await traceManager.launch();
        const result = await startTrace(traceManager);
        return formatResponse(result);
      }

      case 'debug_trace_stop': {
        if (!traceManager) {
          return formatError(new Error('No active trace session. Call debug_trace_start first.'));
        }
        const stopResult = await stopTrace(traceManager);
        await traceManager.close();
        traceManager = null;
        return formatResponse(stopResult);
      }

      default:
        return formatResponse({
          success: false,
          error: `Unknown tool: ${name}`,
        });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return formatResponse({
        success: false,
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
      });
    }
    return formatError(error);
  }
});

async function analyzePageUI(url: string): Promise<UIAnalysis> {
  const manager = new PlaywrightManager();

  try {
    await manager.launch();
    await manager.navigate(url);
    await manager.getPage()?.waitForTimeout(1500);

    const page = manager.getPage();
    if (!page) throw new Error('Page not available');

    const analysis: UIAnalysis = await page.evaluate(() => {
      function getElementInfo(el: Element): { tag: string; text: string; selector: string; attributes: Record<string, string>; hasLabel: boolean; type?: string } {
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim().slice(0, 200);
        const id = el.id ? `#${el.id}` : '';
        const classes = Array.from(el.classList).map(c => `.${c}`).join('');
        const selector = id || `${tag}${classes}` || tag;
        const attributes: Record<string, string> = {};
        for (const attr of el.attributes) {
          attributes[attr.name] = attr.value;
        }
        const hasLabel = !!(
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('label') ||
          (el.previousElementSibling?.tagName === 'LABEL')
        );
        return { tag, text, selector, attributes, hasLabel, type: (el as HTMLInputElement).type };
      }

      const buttons: Element[] = Array.from(document.querySelectorAll(
        'button, a[role="button"], input[type="submit"], input[type="button"], [role="button"]'
      ));
      const forms: Element[] = Array.from(document.querySelectorAll('form'));
      const nav: Element[] = Array.from(document.querySelectorAll(
        'nav, [role="navigation"], header a, .nav, .navbar, .menu'
      ));
      const inputs: Element[] = Array.from(document.querySelectorAll(
        'input:not([type="submit"]):not([type="button"]):not([type="hidden"]), select, textarea'
      ));

      const buttonsInfo = buttons.map(getElementInfo);
      const formsInfo = forms.map(getElementInfo);
      const navInfo = nav.map(getElementInfo);
      const inputsInfo = inputs.map(getElementInfo);

      const missingLabels = inputsInfo.filter(i => !i.hasLabel && !i.attributes['aria-hidden']);
      const inconsistencies: string[] = [];

      const buttonTexts = buttonsInfo.map(b => b.text.toLowerCase()).filter(Boolean);
      const hasSubmit = buttonTexts.some(t => t.includes('submit'));
      const hasSearch = buttonTexts.some(t => t.includes('search'));
      if (formsInfo.length > 0 && !hasSubmit) {
        inconsistencies.push('Form(s) detected without a submit button');
      }

      return {
        url: window.location.href,
        buttons: buttonsInfo,
        forms: formsInfo,
        navigation: navInfo,
        inputs: inputsInfo,
        missingLabels,
        inconsistencies,
        timestamp: new Date().toISOString(),
      };
    });

    return analysis;
  } finally {
    await manager.close();
  }
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test Automation MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
