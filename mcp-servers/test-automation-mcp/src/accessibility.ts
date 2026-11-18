import { AxeBuilder } from '@axe-core/playwright';
import { AccessibilityResult, AccessibilityViolation } from './types.js';
import { PlaywrightManager } from './playwright.js';

export async function checkAccessibility(url: string): Promise<AccessibilityResult> {
  const manager = new PlaywrightManager();

  try {
    await manager.launch();
    await manager.navigate(url);
    await manager.getPage()?.waitForTimeout(1000);

    const page = manager.getPage();
    if (!page) {
      throw new Error('Page not available');
    }

    const results = await new AxeBuilder({ page }).analyze();

    const violations: AccessibilityViolation[] = results.violations.map(v => ({
      id: v.id,
      impact: v.impact || 'minor',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.length,
    }));

    return {
      url,
      violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
      timestamp: new Date().toISOString(),
    };
  } finally {
    await manager.close();
  }
}
