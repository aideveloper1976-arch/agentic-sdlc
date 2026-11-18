import { PlaywrightManager } from './playwright.js';

export interface SnapshotNode {
  role: string;
  name: string;
  children?: SnapshotNode[];
  value?: string | number;
  description?: string;
  keyshortcuts?: string;
  roledescription?: string;
  valuetext?: string;
  disabled?: boolean;
  expanded?: boolean;
  focused?: boolean;
  modal?: boolean;
  multiline?: boolean;
  multiselectable?: boolean;
  readonly?: boolean;
  required?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  pressed?: boolean | 'mixed';
  level?: number;
  valuemin?: number;
  valuemax?: number;
  autocomplete?: string;
  haspopup?: string;
  invalid?: string;
  orientation?: string;
  active?: number;
}

export async function snapshotPage(manager: PlaywrightManager, url: string, selector?: string) {
  await manager.launch();
  await manager.navigate(url);

  const page = manager.getPage();
  if (!page) throw new Error('Page not available');

  let snapshot: SnapshotNode | null;
  const pwPage = page as any;
  if (selector) {
    const element = await page.$(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);
    snapshot = await pwPage.accessibility.snapshot({ root: element });
  } else {
    snapshot = await pwPage.accessibility.snapshot({ interestingOnly: false });
  }

  return {
    url,
    snapshot,
    timestamp: new Date().toISOString(),
  };
}
