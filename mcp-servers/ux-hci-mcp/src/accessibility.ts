import { Page } from 'playwright';
import fs from 'fs';
import { createRequire } from 'module';
import { A11yResult, A11yViolation } from './types.js';

const require = createRequire(import.meta.url);

function getAxeSource(): string {
  try {
    return fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  } catch {
    try {
      return fs.readFileSync(require.resolve('axe-core'), 'utf8');
    } catch {
      throw new Error('Could not load axe-core. Ensure axe-core is installed.');
    }
  }
}

export async function checkAccessibility(page: Page, url: string): Promise<A11yResult> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const axeSource = getAxeSource();
  await page.evaluate(axeSource);

  const result = await page.evaluate(() => {
    return (window as any).axe.run({
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
    });
  });

  const violations: A11yViolation[] = result.violations.map((v: any) => ({
    id: v.id,
    impact: mapImpact(v.impact),
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags,
    elements: v.nodes.slice(0, 5).map((n: any) => {
      const target = n.target ? n.target.join(', ') : '';
      const html = n.html ? n.html.slice(0, 200) : '';
      return target ? `${target} (${html})` : html;
    }),
  }));

  const totalChecks = result.violations.length + result.passes.length + result.incomplete.length + result.inapplicable.length;
  const totalViolationNodes = result.violations.reduce((sum: number, v: any) => sum + v.nodes.length, 0);
  const failRatio = totalChecks > 0 ? totalViolationNodes / totalChecks : 0;
  const score = Math.max(0, Math.round(100 - (failRatio * 100)));

  return {
    url,
    violations,
    passes: result.passes.length,
    incomplete: result.incomplete.length,
    inapplicable: result.inapplicable.length,
    score,
  };
}

function mapImpact(impact: string): 'low' | 'medium' | 'high' | 'critical' {
  switch (impact) {
    case 'critical': return 'critical';
    case 'serious': return 'high';
    case 'moderate': return 'medium';
    default: return 'low';
  }
}
