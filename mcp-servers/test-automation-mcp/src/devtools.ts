import { PlaywrightManager } from './playwright.js';
import path from 'path';
import { config } from './config.js';

export async function highlight(manager: PlaywrightManager, selector: string, style?: string) {
  const page = manager.getPage();
  if (!page) throw new Error('Browser not launched');

  await page.evaluate(({ sel, css }: { sel: string; css?: string }) => {
    const existing = document.getElementById('playwright-highlight-overlay');
    if (existing) existing.remove();

    const el = document.querySelector(sel);
    if (!el) return false;

    const overlay = document.createElement('div');
    overlay.id = 'playwright-highlight-overlay';
    overlay.style.cssText = css || 'outline: 3px solid #FF0000; background: rgba(255,0,0,0.1); position: fixed; z-index: 99999; pointer-events: none;';
    const rect = el.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    document.body.appendChild(overlay);
    return true;
  }, { sel: selector, css: style });

  return { success: true, selector, highlighted: true };
}

export async function startTrace(manager: PlaywrightManager) {
  const context = manager.getContext();
  if (!context) throw new Error('Browser not launched');
  await context.tracing.start({ screenshots: true, snapshots: true });
  return { success: true, tracing: 'started' };
}

export async function stopTrace(manager: PlaywrightManager) {
  const context = manager.getContext();
  if (!context) throw new Error('Browser not launched');
  const tracePath = path.join(config.evidenceDir, `trace-${Date.now()}.zip`);
  await context.tracing.stop({ path: tracePath });
  return { success: true, tracePath };
}
