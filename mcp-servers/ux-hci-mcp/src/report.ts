import { UXReport, UIAnalysisResult, UsabilityResult, UXIssuesResult, A11yResult, UserFlowResult, FormAnalysisResult, Severity, UXIssue } from './types.js';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';

export function generateUXReport(params: {
  featureId: string;
  url?: string;
  uiStructure?: UIAnalysisResult;
  usability?: UsabilityResult;
  userFlow?: UserFlowResult;
  uxIssues?: UXIssuesResult;
  accessibility?: A11yResult;
  formAnalysis?: FormAnalysisResult;
}): UXReport {
  const allIssues: Array<{ severity: Severity; type: string }> = [];

  if (params.uiStructure) {
    params.uiStructure.issues.forEach(i => allIssues.push({ severity: i.severity, type: i.type }));
  }
  if (params.usability) {
    params.usability.issues.forEach(i => allIssues.push({ severity: i.severity, type: i.heuristic }));
  }
  if (params.uxIssues) {
    params.uxIssues.issues.forEach(i => allIssues.push({ severity: i.severity, type: i.type }));
  }
  if (params.accessibility) {
    params.accessibility.violations.forEach(v => allIssues.push({ severity: v.impact, type: v.id }));
  }
  if (params.formAnalysis) {
    params.formAnalysis.forms.forEach(f => f.issues.forEach(i => allIssues.push({ severity: i.severity, type: i.type })));
  }

  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const highCount = allIssues.filter(i => i.severity === 'high').length;
  const mediumCount = allIssues.filter(i => i.severity === 'medium').length;
  const lowCount = allIssues.filter(i => i.severity === 'low').length;

  const scores: number[] = [];
  if (params.usability) scores.push(params.usability.overallScore);
  if (params.accessibility) scores.push(params.accessibility.score);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const reportPath = path.join(config.uxPath, `${params.featureId}.md`);
  const report: UXReport = {
    featureId: params.featureId,
    generatedAt: new Date().toISOString(),
    url: params.url,
    uiStructure: params.uiStructure,
    usability: params.usability,
    userFlow: params.userFlow,
    uxIssues: params.uxIssues,
    accessibility: params.accessibility,
    formAnalysis: params.formAnalysis,
    summary: {
      totalIssues: allIssues.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      overallScore,
    },
    reportPath,
  };

  const markdown = buildMarkdown(report);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, markdown, 'utf8');

  return report;
}

function buildMarkdown(report: UXReport): string {
  const lines: string[] = [];

  lines.push(`# UX Report: ${report.featureId}`);
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Overall Score:** ${report.summary.overallScore}/100`);
  if (report.url) {
    lines.push(`**URL:** ${report.url}`);
  }
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Issues | ${report.summary.totalIssues} |`);
  lines.push(`| Critical | ${report.summary.criticalCount} |`);
  lines.push(`| High | ${report.summary.highCount} |`);
  lines.push(`| Medium | ${report.summary.mediumCount} |`);
  lines.push(`| Low | ${report.summary.lowCount} |`);
  lines.push(`| Score | ${report.summary.overallScore}/100 |`);
  lines.push('');

  if (report.usability) {
    lines.push('## Usability Evaluation');
    lines.push('');
    lines.push(`**Usability Score:** ${report.usability.overallScore}/100`);
    lines.push('');

    lines.push('### Heuristic Scores');
    lines.push('');
    lines.push('| Heuristic | Score |');
    lines.push('|-----------|-------|');
    for (const h of report.usability.heuristics) {
      lines.push(`| ${h.heuristic} | ${h.score}/10 |`);
    }
    lines.push('');

    if (report.usability.issues.length > 0) {
      lines.push('### Usability Issues');
      lines.push('');
      for (const issue of report.usability.issues) {
        lines.push(`- **[${issue.severity.toUpperCase()}]** ${issue.heuristic}: ${issue.description}`);
        lines.push(`  - *Recommendation:* ${issue.recommendation}`);
      }
      lines.push('');
    }
  }

  if (report.accessibility) {
    lines.push('## Accessibility');
    lines.push('');
    lines.push(`**Accessibility Score:** ${report.accessibility.score}/100`);
    lines.push(`**Violations:** ${report.accessibility.violations.length}`);
    lines.push(`**Passes:** ${report.accessibility.passes}`);
    lines.push(`**Incomplete:** ${report.accessibility.incomplete}`);
    lines.push('');

    if (report.accessibility.violations.length > 0) {
      for (const v of report.accessibility.violations) {
        lines.push(`### ${v.id} [${v.impact.toUpperCase()}]`);
        lines.push(`- ${v.description}`);
        lines.push(`- ${v.help}`);
        lines.push(`- [Learn more](${v.helpUrl})`);
        lines.push('- Affected elements:');
        v.elements.forEach(e => lines.push(`  - \`${e}\``));
        lines.push('');
      }
    }
  }

  if (report.uxIssues && report.uxIssues.issues.length > 0) {
    lines.push('## UX Issues');
    lines.push('');
    for (const issue of report.uxIssues.issues) {
      lines.push(`- **[${issue.severity.toUpperCase()}]** [${issue.category}] ${issue.description}`);
      lines.push(`  - *Recommendation:* ${issue.recommendation}`);
    }
    lines.push('');

    if (report.uxIssues.patternSummary) {
      lines.push('### Detected Patterns');
      lines.push('');
      for (const pattern of report.uxIssues.patternSummary) {
        lines.push(`- ${pattern}`);
      }
      lines.push('');
    }
  }

  if (report.userFlow) {
    lines.push('## User Flow Analysis');
    lines.push('');
    lines.push(`**Flow:** ${report.userFlow.flowName}`);
    lines.push(`**Steps:** ${report.userFlow.totalSteps}`);
    lines.push(`**Decision Points:** ${report.userFlow.decisionPoints}`);
    lines.push(`**Estimated Clicks:** ${report.userFlow.estimatedClicks}`);
    lines.push(`**Cognitive Load:** ${report.userFlow.cognitiveLoad}`);
    lines.push('');

    if (report.userFlow.frictionAreas.length > 0) {
      lines.push('### Friction Areas');
      lines.push('');
      report.userFlow.frictionAreas.forEach(f => lines.push(`- ${f}`));
      lines.push('');
    }
  }

  if (report.uiStructure) {
    lines.push('## UI Structure');
    lines.push('');
    lines.push('| Element Type | Count |');
    lines.push('|-------------|-------|');
    lines.push(`| Headings | ${report.uiStructure.headings.length} |`);
    lines.push(`| Buttons | ${report.uiStructure.buttons.length} |`);
    lines.push(`| Forms | ${report.uiStructure.forms.length} |`);
    lines.push(`| Inputs | ${report.uiStructure.inputs.length} |`);
    lines.push(`| Navigation | ${report.uiStructure.navigation.length} |`);
    lines.push('');

    if (report.uiStructure.issues.length > 0) {
      lines.push('### UI Structure Issues');
      lines.push('');
      for (const issue of report.uiStructure.issues) {
        lines.push(`- **[${issue.severity.toUpperCase()}]** ${issue.description}`);
        if (issue.selector) lines.push(`  - *Element:* \`${issue.selector}\``);
        lines.push(`  - *Recommendation:* ${issue.recommendation}`);
      }
      lines.push('');
    }
  }

  if (report.formAnalysis && report.formAnalysis.forms.length > 0) {
    lines.push('## Form Analysis');
    lines.push('');
    for (const form of report.formAnalysis.forms) {
      lines.push(`### Form: ${form.selector}`);
      lines.push(`- Action: ${form.action || 'N/A'}`);
      lines.push(`- Method: ${form.method}`);
      lines.push(`- Fields: ${form.fields.length}`);

      const missingLabels = form.issues.filter(i => i.type === 'missing_label');
      if (missingLabels.length > 0) {
        lines.push(`- Missing labels: ${missingLabels.length}`);
        for (const issue of missingLabels) {
          lines.push(`  - **[${issue.severity.toUpperCase()}]** ${issue.description}`);
        }
      }

      const requiredFields = form.fields.filter(f => f.required);
      if (requiredFields.length > 0) {
        lines.push(`- Required fields: ${requiredFields.map(f => f.name || f.selector).join(', ')}`);
      }

      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(`*Report generated by OpenCode UX/HCI MCP*`);

  return lines.join('\n');
}
