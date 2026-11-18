import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TestOutput, EvidenceEntry, TestReport } from './types.js';
import { config } from './config.js';

export function saveEvidence(entry: EvidenceEntry): string {
  const dir = config.evidenceDir;
  fs.mkdirSync(dir, { recursive: true });

  const baseName = `${entry.entityId}-${entry.testName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const jsonPath = path.join(dir, `${baseName}.json`);
  const mdPath = path.join(dir, `${baseName}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(entry, null, 2));

  const markdown = [
    `# Test Evidence: ${entry.testName}`,
    '',
    `- **Entity ID:** ${entry.entityId}`,
    `- **Result:** ${entry.result}`,
    `- **Duration:** ${entry.durationMs}ms`,
    `- **Timestamp:** ${entry.timestamp}`,
    '',
    '## Summary',
    '',
    entry.summary,
    '',
    '## Evidence Files',
    '',
    ...entry.evidencePaths.map(p => `- ${p}`),
    '',
  ].join('\n');

  fs.writeFileSync(mdPath, markdown);

  return jsonPath;
}

export function generateTestReport(
  testName: string,
  results: TestOutput[],
): TestReport {
  const dir = config.screenshotDir;
  fs.mkdirSync(dir, { recursive: true });

  const passed = results.filter(r => r.result === 'passed').length;
  const failed = results.filter(r => r.result === 'failed').length;

  const report: TestReport = {
    testName,
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed,
    results,
    reportPath: '',
  };

  const filename = `${testName.replace(/[^a-zA-Z0-9_-]/g, '_')}-report-${Date.now()}.md`;
  report.reportPath = path.join(dir, filename);

  const markdown = generateReportMarkdown(report);
  fs.writeFileSync(report.reportPath, markdown);

  const jsonPath = report.reportPath.replace('.md', '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  return report;
}

function generateReportMarkdown(report: TestReport): string {
  const lines: string[] = [];
  lines.push(`# Test Report: ${report.testName}`);
  lines.push('');
  lines.push(`- **Timestamp:** ${report.timestamp}`);
  lines.push(`- **Total Tests:** ${report.totalTests}`);
  lines.push(`- **Passed:** ${report.passed}`);
  lines.push(`- **Failed:** ${report.failed}`);
  lines.push('');

  const rate = report.totalTests > 0 ? Math.round((report.passed / report.totalTests) * 100) : 0;
  lines.push(`- **Pass Rate:** ${rate}%`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Test | Result | Duration | Error |');
  lines.push('|------|--------|----------|-------|');

  for (const r of report.results) {
    const icon = r.result === 'passed' ? '✅' : r.result === 'failed' ? '❌' : '⚠️';
    const error = r.error ? r.error.slice(0, 100) : '-';
    lines.push(`| ${r.testName} | ${icon} ${r.result} | ${r.durationMs}ms | ${error} |`);
  }

  lines.push('');

  for (const r of report.results) {
    lines.push(`### ${r.testName}`);
    lines.push('');
    lines.push(`- **Result:** ${r.result}`);
    lines.push(`- **Duration:** ${r.durationMs}ms`);
    lines.push('');

    if (r.error) {
      lines.push('**Error:**');
      lines.push('```');
      lines.push(r.error);
      lines.push('```');
      lines.push('');
    }

    if (r.steps && r.steps.length > 0) {
      lines.push('**Steps:**');
      lines.push('');
      lines.push('| # | Action | Selector | Result | Duration |');
      lines.push('|---|--------|----------|--------|----------|');
      r.steps.forEach((s, i) => {
        lines.push(`| ${i + 1} | ${s.action} | ${s.selector || '-'} | ${s.passed ? '✅' : '❌'} | ${s.durationMs}ms |`);
      });
      lines.push('');
    }

    if (r.screenshots && r.screenshots.length > 0) {
      lines.push('**Screenshots:**');
      lines.push('');
      r.screenshots.forEach(s => {
        lines.push(`- ![screenshot](${s})`);
      });
      lines.push('');
    }

    if (r.logs && r.logs.length > 0) {
      lines.push('**Logs:**');
      lines.push('```');
      lines.push(r.logs.join('\n'));
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function collectExistingEvidence(testName: string): TestOutput[] {
  const dir = config.screenshotDir;
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(testName.replace(/[^a-zA-Z0-9_-]/g, '_')) && f.endsWith('.json'));

  return files.map(f => {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      return JSON.parse(content) as TestOutput;
    } catch {
      return null;
    }
  }).filter((r): r is TestOutput => r !== null);
}
