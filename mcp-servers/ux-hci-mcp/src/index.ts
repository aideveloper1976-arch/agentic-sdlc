#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { config } from './config.js';
import { createPage, closeBrowser } from './browser.js';
import { analyzeUIStructure } from './ui.js';
import { evaluateUsability } from './heuristics.js';
import { checkAccessibility } from './accessibility.js';
import { analyzeUserFlow, captureUserJourney, analyzeForms } from './flows.js';
import { generateUXReport } from './report.js';
import { saveUXEvidence } from './evidence.js';
import { detectUXIssues } from './issues.js';
import { Severity } from './types.js';
import fs from 'fs';

const server = new Server(
  {
    name: 'opencode-ux-hci-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    return config.allowedDomains.some(domain => {
      if (domain.startsWith('*.')) {
        return parsed.hostname.endsWith(domain.slice(1));
      }
      return parsed.hostname === domain;
    });
  } catch {
    return false;
  }
}

const UrlSchema = z.object({
  url: z.string().url(),
});

const FlowSchema = z.object({
  url: z.string().url(),
  flowName: z.string(),
});

const JourneySchema = z.object({
  url: z.string().url(),
  steps: z.array(z.object({
    action: z.string(),
    selector: z.string().optional(),
    value: z.string().optional(),
    wait: z.number().optional(),
  })),
});

const ReportSchema = z.object({
  featureId: z.string(),
  url: z.string().url().optional(),
  uiStructure: z.any().optional(),
  usability: z.any().optional(),
  userFlow: z.any().optional(),
  uxIssues: z.any().optional(),
  accessibility: z.any().optional(),
  formAnalysis: z.any().optional(),
});

const EvidenceSchema = z.object({
  entityId: z.string(),
  findings: z.any(),
  severitySummary: z.object({
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    critical: z.number(),
  }),
  reportPath: z.string(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze_ui_structure',
      description: 'Extract and analyze UI structure including headings, buttons, forms, inputs, navigation',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to analyze' },
        },
        required: ['url'],
      },
    },
    {
      name: 'evaluate_usability',
      description: 'Evaluate usability using Nielsen\'s 10 heuristics and score the page (0-100)',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to evaluate' },
        },
        required: ['url'],
      },
    },
    {
      name: 'analyze_user_flow',
      description: 'Analyze user flow, identify steps, decision points, and friction areas',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Starting URL' },
          flowName: { type: 'string', description: 'Name of the flow to analyze' },
        },
        required: ['url', 'flowName'],
      },
    },
    {
      name: 'detect_ux_issues',
      description: 'Detect UX issues: broken flows, unclear CTAs, inconsistent navigation, overloaded UI',
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
      description: 'Run axe-core accessibility checks and return WCAG violations with severity',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to check' },
        },
        required: ['url'],
      },
    },
    {
      name: 'capture_user_journey',
      description: 'Execute a multi-step user journey and capture screenshots at each step',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Starting URL' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', description: 'Description of the step' },
                selector: { type: 'string', description: 'CSS selector to interact with' },
                value: { type: 'string', description: 'Value to fill into the input' },
                wait: { type: 'number', description: 'Wait time in ms after step' },
              },
              required: ['action'],
            },
          },
        },
        required: ['url', 'steps'],
      },
    },
    {
      name: 'analyze_forms',
      description: 'Analyze forms for required fields, validation rules, labels, and error handling',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to analyze' },
        },
        required: ['url'],
      },
    },
    {
      name: 'generate_ux_report',
      description: 'Generate a comprehensive UX report markdown file for a feature/story. Pass analysis data to get an aggregated report with findings.',
      inputSchema: {
        type: 'object',
        properties: {
          featureId: { type: 'string', description: 'Feature or Story ID (e.g., FTR-123)' },
          url: { type: 'string', description: 'Optional URL to include in report metadata' },
          uiStructure: { type: 'object', description: 'Optional UI structure analysis result from analyze_ui_structure' },
          usability: { type: 'object', description: 'Optional usability evaluation result from evaluate_usability' },
          userFlow: { type: 'object', description: 'Optional user flow analysis result from analyze_user_flow' },
          uxIssues: { type: 'object', description: 'Optional UX issues result from detect_ux_issues' },
          accessibility: { type: 'object', description: 'Optional accessibility result from check_accessibility' },
          formAnalysis: { type: 'object', description: 'Optional form analysis result from analyze_forms' },
        },
        required: ['featureId'],
      },
    },
    {
      name: 'save_ux_evidence',
      description: 'Save UX evidence JSON and markdown linked to a traceability entity',
      inputSchema: {
        type: 'object',
        properties: {
          entityId: { type: 'string', description: 'Entity ID to link evidence to' },
          findings: { type: 'object', description: 'Analysis findings data object' },
          severitySummary: {
            type: 'object',
            properties: {
              low: { type: 'number' },
              medium: { type: 'number' },
              high: { type: 'number' },
              critical: { type: 'number' },
            },
            required: ['low', 'medium', 'high', 'critical'],
          },
          reportPath: { type: 'string', description: 'Path to the generated UX report' },
        },
        required: ['entityId', 'findings', 'severitySummary', 'reportPath'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_ui_structure': {
        const { url } = UrlSchema.parse(args);
        if (!isUrlAllowed(url)) throw new Error(`URL not in allowed domains: ${url}`);
        const page = await createPage();
        try {
          const result = await analyzeUIStructure(page, url);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'ui_structure' }, null, 2) }],
          };
        } finally {
          await page.close();
        }
      }

      case 'evaluate_usability': {
        const { url } = UrlSchema.parse(args);
        if (!isUrlAllowed(url)) throw new Error(`URL not in allowed domains: ${url}`);
        const page = await createPage();
        try {
          const result = await evaluateUsability(page, url);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'usability' }, null, 2) }],
          };
        } finally {
          await page.close();
        }
      }

      case 'analyze_user_flow': {
        const { url, flowName } = FlowSchema.parse(args);
        if (!isUrlAllowed(url)) throw new Error(`URL not in allowed domains: ${url}`);
        const page = await createPage();
        try {
          const result = await analyzeUserFlow(page, url, flowName);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'user_flow' }, null, 2) }],
          };
        } finally {
          await page.close();
        }
      }

      case 'detect_ux_issues': {
        const { url } = UrlSchema.parse(args);
        if (!isUrlAllowed(url)) throw new Error(`URL not in allowed domains: ${url}`);
        const page = await createPage();
        try {
          const result = await detectUXIssues(page, url);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'ux_issues' }, null, 2) }],
          };
        } finally {
          await page.close();
        }
      }

      case 'check_accessibility': {
        const { url } = UrlSchema.parse(args);
        if (!isUrlAllowed(url)) throw new Error(`URL not in allowed domains: ${url}`);
        const page = await createPage();
        try {
          const result = await checkAccessibility(page, url);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'accessibility' }, null, 2) }],
          };
        } finally {
          await page.close();
        }
      }

      case 'capture_user_journey': {
        const { url, steps } = JourneySchema.parse(args);
        if (!isUrlAllowed(url)) throw new Error(`URL not in allowed domains: ${url}`);
        const page = await createPage();
        try {
          const result = await captureUserJourney(page, url, steps);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'user_journey' }, null, 2) }],
          };
        } finally {
          await page.close();
        }
      }

      case 'analyze_forms': {
        const { url } = UrlSchema.parse(args);
        if (!isUrlAllowed(url)) throw new Error(`URL not in allowed domains: ${url}`);
        const page = await createPage();
        try {
          const result = await analyzeForms(page, url);
          return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'form_analysis' }, null, 2) }],
          };
        } finally {
          await page.close();
        }
      }

      case 'generate_ux_report': {
        const { featureId, url, uiStructure, usability, userFlow, uxIssues, accessibility, formAnalysis } = ReportSchema.parse(args);
        const result = generateUXReport({
          featureId,
          url,
          uiStructure,
          usability,
          userFlow,
          uxIssues,
          accessibility,
          formAnalysis,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'ux_report' }, null, 2) }],
        };
      }

      case 'save_ux_evidence': {
        const { entityId, findings, severitySummary, reportPath } = EvidenceSchema.parse(args);
        const result = saveUXEvidence({
          entityId,
          analysisType: 'ux_report',
          findings,
          severitySummary: severitySummary as Record<Severity, number>,
          reportPath,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ ...result, success: true, analysisType: 'evidence' }, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: message }, null, 2) }],
      isError: true,
    };
  }
});

async function main() {
  fs.mkdirSync(config.uxPath, { recursive: true });
  fs.mkdirSync(config.hciPath, { recursive: true });
  fs.mkdirSync(config.screenshotsPath, { recursive: true });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('UX/HCI MCP Server running on stdio');

  process.on('SIGINT', async () => {
    await closeBrowser();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await closeBrowser();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
