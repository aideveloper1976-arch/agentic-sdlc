import { Page } from 'playwright';
import { UXIssue, UXIssuesResult } from './types.js';

export async function detectUXIssues(page: Page, url: string): Promise<UXIssuesResult> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const issues = await page.evaluate(() => {
    const found: any[] = [];

    document.querySelectorAll('a[href="#"], a[href=""], a[href="javascript:void(0)"]').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim();
      if (text && text.length > 0) {
        found.push({
          type: 'broken_flow',
          severity: 'high',
          description: `Link "${text}" has no valid destination (placeholder href).`,
          recommendation: 'Remove placeholder links or add proper href values pointing to real content.',
          category: 'navigation',
          pattern: 'placeholder_link',
        });
      }
    });

    document.querySelectorAll('button, a[role="button"], input[type="submit"], input[type="button"]').forEach(el => {
      const text = ((el as HTMLElement).innerText?.trim() || (el as HTMLInputElement).value || '').trim();
      if (text.length > 0 && text.length < 3) {
        found.push({
          type: 'unclear_cta',
          severity: 'high',
          description: `Button/link with unclear label: "${text}" — users may not understand the action.`,
          recommendation: 'Use descriptive, action-oriented labels (e.g., "Submit Application" instead of "Go" or "OK").',
          category: 'cta',
          pattern: 'vague_cta',
        });
      }
    });

    const linkCount = document.querySelectorAll('a').length;
    const buttonCount = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]').length;
    const totalCtas = linkCount + buttonCount;
    if (totalCtas > 20) {
      found.push({
        type: 'overloaded_ui',
        severity: 'medium',
        description: `Page has ${totalCtas} clickable elements (${linkCount} links, ${buttonCount} buttons), which may overwhelm users with too many choices.`,
        recommendation: 'Prioritize primary actions (1-3 main CTAs) and reduce secondary links. Use progressive disclosure for less common actions.',
        category: 'layout',
        pattern: 'cta_overload',
      });
    }

    const formElements = document.querySelectorAll('form').length;
    const feedbackElements = document.querySelectorAll('[role="alert"], [role="status"], .success, .error, .toast, .notification, [class*="alert"]');
    if (formElements > 0 && feedbackElements.length === 0) {
      found.push({
        type: 'poor_feedback',
        severity: 'high',
        description: `${formElements} form(s) detected but no feedback mechanisms (success/error messages) found. Users may not know if their action succeeded.`,
        recommendation: 'Add success confirmation messages and inline error messages after form submission or validation.',
        category: 'feedback',
        pattern: 'missing_feedback',
      });
    }

    const navElements = document.querySelectorAll('nav, [role="navigation"], header').length;
    if (navElements > 2) {
      found.push({
        type: 'inconsistent_navigation',
        severity: 'medium',
        description: `${navElements} navigation regions detected. Multiple navigation systems may confuse users.`,
        recommendation: 'Consolidate navigation into a single primary navigation system with consistent placement and styling.',
        category: 'navigation',
        pattern: 'multiple_navs',
      });
    }

    return found;
  });

  const patternMap = new Map<string, number>();
  issues.forEach((i: any) => {
    if (i.pattern) {
      patternMap.set(i.pattern, (patternMap.get(i.pattern) || 0) + 1);
    }
  });

  const patternSummary: string[] = [];
  patternMap.forEach((count, pattern) => {
    if (count > 1) {
      patternSummary.push(`Repeated pattern "${pattern}" appears ${count} times across the page`);
    }
  });

  return {
    url,
    issues,
    patternSummary: patternSummary.length > 0 ? patternSummary : undefined,
  };
}
