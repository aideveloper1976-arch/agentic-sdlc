import { PlaywrightManager } from './playwright.js';

interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: string;
  location?: string;
}

export async function getConsoleLogs(manager: PlaywrightManager, url: string, level: string = 'info') {
  await manager.launch();
  const page = manager.getPage();
  if (!page) throw new Error('Browser not launched');

  const entries: ConsoleEntry[] = [];
  const levelPriority: Record<string, number> = { debug: 0, info: 1, warning: 2, error: 3 };
  const minPriority = levelPriority[level] ?? 1;

  page.on('console', (msg) => {
    const msgType = msg.type();
    if (levelPriority[msgType] >= minPriority) {
      entries.push({
        type: msgType,
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location().url || undefined,
      });
    }
  });

  page.on('pageerror', (err) => {
    entries.push({
      type: 'pageerror',
      text: err.message,
      timestamp: new Date().toISOString(),
      location: err.stack || undefined,
    });
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  return { url, entries, count: entries.length };
}
