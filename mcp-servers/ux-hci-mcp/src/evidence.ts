import { EvidenceData, Severity, AnalysisType } from './types.js';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { v4 as uuidv4 } from 'uuid';

export function saveUXEvidence(params: {
  entityId: string;
  analysisType: AnalysisType;
  findings: unknown;
  severitySummary: Record<Severity, number>;
  reportPath: string;
}): EvidenceData {
  const evidenceId = uuidv4();
  const evidenceDir = path.join(config.uxPath, 'evidence', params.entityId);
  fs.mkdirSync(evidenceDir, { recursive: true });

  const evidencePath = path.join(evidenceDir, `${evidenceId}.json`);

  const evidence: EvidenceData = {
    entityId: params.entityId,
    analysisType: params.analysisType,
    findings: params.findings,
    severitySummary: params.severitySummary,
    reportPath: params.reportPath,
    evidencePath,
    timestamp: new Date().toISOString(),
  };

  const markdownPath = path.join(evidenceDir, `${evidenceId}.md`);
  const markdown = buildEvidenceMarkdown(evidence);

  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
  fs.writeFileSync(markdownPath, markdown, 'utf8');

  return evidence;
}

function buildEvidenceMarkdown(evidence: EvidenceData): string {
  const lines: string[] = [];
  lines.push(`# UX Evidence: ${evidence.entityId}`);
  lines.push('');
  lines.push(`**Type:** ${evidence.analysisType}`);
  lines.push(`**Timestamp:** ${evidence.timestamp}`);
  lines.push(`**Evidence ID:** ${path.basename(evidence.evidencePath, '.json')}`);
  lines.push('');
  lines.push('## Severity Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  for (const [severity, count] of Object.entries(evidence.severitySummary)) {
    if (count > 0) {
      lines.push(`| ${severity} | ${count} |`);
    }
  }
  lines.push('');
  lines.push(`**Report:** [${evidence.reportPath}](${evidence.reportPath})`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*Evidence captured by OpenCode UX/HCI MCP*`);

  return lines.join('\n');
}
