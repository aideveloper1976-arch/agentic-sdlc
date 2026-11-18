import { Page } from 'playwright';
import { UIAnalysisResult, UIElement, UIIssue } from './types.js';

export async function analyzeUIStructure(page: Page, url: string): Promise<UIAnalysisResult> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const headings = await extractElements(page, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const buttons = await extractElements(page, ['button', 'input[type="submit"]', 'input[type="button"]', 'a[role="button"]']);
  const forms = await extractElements(page, ['form']);
  const inputs = await extractElements(page, ['input', 'select', 'textarea']);
  const navigation = await extractElements(page, ['nav', 'header nav', '[role="navigation"]']);

  const issues = await detectIssues(page);

  return {
    url,
    headings,
    buttons,
    forms,
    inputs,
    navigation,
    issues,
    structure: [...headings, ...buttons, ...forms, ...inputs, ...navigation],
  };
}

async function extractElements(page: Page, selectors: string[]): Promise<UIElement[]> {
  return await page.evaluate((sels) => {
    const elements: any[] = [];
    sels.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        elements.push({
          tag: el.tagName.toLowerCase(),
          text: ((el as HTMLElement).innerText || '').slice(0, 200) || undefined,
          attributes: Object.fromEntries(Array.from(el.attributes).map(a => [a.name, a.value])),
          selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + (el.className as string).split(' ').filter(Boolean).join('.') : ''),
          hasLabel: !!(el as HTMLElement).getAttribute('aria-label') || !!(el as HTMLElement).getAttribute('aria-labelledby'),
          isVisible: (el as HTMLElement).offsetParent !== null,
        });
      });
    });
    return elements;
  }, selectors);
}

async function detectIssues(page: Page): Promise<UIIssue[]> {
  return await page.evaluate(() => {
    const issues: any[] = [];

    document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
      const field = el as HTMLInputElement;
      const id = field.id;
      const name = field.name;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (!label && !field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
          issues.push({
            type: 'missing_label',
            severity: 'high',
            description: `Input element missing label: <${field.tagName.toLowerCase()}${name ? ' name="' + name + '"' : id ? ' id="' + id + '"' : ''}>`,
            recommendation: 'Add a <label> element with a for attribute matching the input id, or use aria-label.',
            selector: field.tagName.toLowerCase() + (name ? `[name="${name}"]` : id ? `#${id}` : ''),
          });
        }
      } else if (!field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
        issues.push({
          type: 'missing_label',
          severity: 'high',
          description: `Input element without id or label: <${field.tagName.toLowerCase()}${name ? ' name="' + name + '"' : ''}>`,
          recommendation: 'Add an id attribute and a matching <label> element, or use aria-label.',
          selector: field.tagName.toLowerCase() + (name ? `[name="${name}"]` : ''),
        });
      }
    });

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      if (!(el as HTMLElement).innerText?.trim()) {
        issues.push({
          type: 'empty_heading',
          severity: 'medium',
          description: `Empty heading found: <${el.tagName.toLowerCase()}>`,
          recommendation: 'Remove empty headings or add meaningful content.',
          selector: el.tagName.toLowerCase(),
        });
      }
    });

    document.querySelectorAll('img:not([alt])').forEach(el => {
      const src = el.getAttribute('src');
      if (src) {
        issues.push({
          type: 'missing_alt',
          severity: 'high',
          description: `Image missing alt text: ${src.slice(0, 100)}`,
          recommendation: 'Add descriptive alt text to all images.',
          selector: `img[src="${src}"]`,
        });
      }
    });

    document.querySelectorAll('*').forEach(el => {
      let depth = 0;
      let parent = el.parentElement;
      while (parent) {
        depth++;
        parent = parent.parentElement;
        if (depth > 15) {
          issues.push({
            type: 'deeply_nested',
            severity: 'low',
            description: `Element deeply nested (depth: ${depth}): <${el.tagName.toLowerCase()}>`,
            recommendation: 'Flatten DOM structure to improve performance and maintainability.',
            selector: el.tagName.toLowerCase(),
          });
          return;
        }
      }
    });

    const ids = new Map<string, number>();
    document.querySelectorAll('[id]').forEach(el => {
      const id = el.id;
      ids.set(id, (ids.get(id) || 0) + 1);
    });
    ids.forEach((count, id) => {
      if (count > 1) {
        issues.push({
          type: 'duplicate_id',
          severity: 'high',
          description: `Duplicate ID found: "${id}" (${count} occurrences)`,
          recommendation: 'Ensure all IDs are unique within the document.',
          selector: `#${id}`,
        });
      }
    });

    return issues;
  });
}
