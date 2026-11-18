import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TestStep, FlowResult } from './types.js';
import { config, resolveUrl, validateUrl } from './config.js';
import { PlaywrightManager } from './playwright.js';

export async function executeUserFlow(
  url: string,
  flowName: string,
  steps: TestStep[],
): Promise<FlowResult> {
  const manager = new PlaywrightManager();
  const start = Date.now();

  try {
    await manager.launch();

    const resolvedUrl = resolveUrl(url);
    const validation = validateUrl(resolvedUrl);
    if (!validation.valid) {
      throw new Error(`URL not allowed: ${validation.reason}`);
    }

    const { results, screenshots } = await manager.executeSteps(url, steps);
    const logs = manager.getLogs();
    const durationMs = Date.now() - start;

    const allPassed = results.every(r => r.passed);

    const uxDir = config.uxDir;
    fs.mkdirSync(uxDir, { recursive: true });

    const flowRecord: FlowResult = {
      flowName,
      url: resolvedUrl,
      success: allPassed,
      steps: results,
      screenshots,
      logs,
      durationMs,
    };

    const evidenceFilename = `${flowName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.json`;
    const evidencePath = path.join(uxDir, evidenceFilename);
    fs.writeFileSync(evidencePath, JSON.stringify(flowRecord, null, 2));

    flowRecord.evidencePath = evidencePath;

    const markdownPath = evidencePath.replace('.json', '.md');
    const markdown = generateFlowMarkdown(flowRecord);
    fs.writeFileSync(markdownPath, markdown);

    return flowRecord;
  } catch (error: any) {
    const durationMs = Date.now() - start;
    return {
      flowName,
      url,
      success: false,
      steps: [],
      screenshots: [],
      logs: manager.getLogs(),
      durationMs,
    };
  } finally {
    await manager.close();
  }
}

function generateFlowMarkdown(flow: FlowResult): string {
  const lines: string[] = [];
  lines.push(`# User Flow: ${flow.flowName}`);
  lines.push('');
  lines.push(`- **URL:** ${flow.url}`);
  lines.push(`- **Status:** ${flow.success ? '✅ Passed' : '❌ Failed'}`);
  lines.push(`- **Duration:** ${flow.durationMs}ms`);
  lines.push(`- **Timestamp:** ${new Date().toISOString()}`);
  lines.push('');

  if (flow.steps.length > 0) {
    lines.push('## Steps');
    lines.push('');
    lines.push('| # | Action | Selector | Value | Status | Duration |');
    lines.push('|---|--------|----------|-------|--------|----------|');
    flow.steps.forEach((step, i) => {
      const status = step.passed ? '✅' : '❌';
      const selector = step.selector || '-';
      const value = step.value || '-';
      lines.push(`| ${i + 1} | ${step.action} | ${selector} | ${value} | ${status} | ${step.durationMs}ms |`);
    });
    lines.push('');
  }

  if (flow.screenshots.length > 0) {
    lines.push('## Screenshots');
    lines.push('');
    flow.screenshots.forEach((s, i) => {
      lines.push(`![Step ${i}](${s})`);
      lines.push('');
    });
  }

  if (flow.logs.length > 0) {
    lines.push('## Logs');
    lines.push('');
    lines.push('```');
    lines.push(flow.logs.join('\n'));
    lines.push('```');
  }

  return lines.join('\n');
}
