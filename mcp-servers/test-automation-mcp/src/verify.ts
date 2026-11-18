import { PlaywrightManager } from './playwright.js';

export async function verifyElement(manager: PlaywrightManager, role: string, accessibleName: string) {
  const page = manager.getPage();
  if (!page) throw new Error('Browser not launched');

  const locator = page.getByRole(role as any, { name: accessibleName, exact: true });
  const isVisible = await locator.isVisible();
  const count = await locator.count();

  return {
    role,
    accessibleName,
    visible: isVisible,
    count,
    passed: isVisible && count > 0,
    timestamp: new Date().toISOString(),
  };
}

export async function verifyText(manager: PlaywrightManager, text: string) {
  const page = manager.getPage();
  if (!page) throw new Error('Browser not launched');

  const locator = page.getByText(text, { exact: false });
  const isVisible = await locator.first().isVisible().catch(() => false);
  const count = await locator.count();

  return {
    text,
    visible: isVisible,
    occurrenceCount: count,
    passed: isVisible && count > 0,
    timestamp: new Date().toISOString(),
  };
}

export async function verifyValue(manager: PlaywrightManager, selector: string, value: string, type?: string) {
  const page = manager.getPage();
  if (!page) throw new Error('Browser not launched');

  try {
    if (type === 'checkbox') {
      const checked = await page.isChecked(selector);
      return { selector, expected: value, actual: String(checked), passed: String(checked) === value, timestamp: new Date().toISOString() };
    }

    const inputValue = await page.inputValue(selector).catch(() => '');
    const textContent = await page.textContent(selector).catch(() => '');
    const actual = inputValue || textContent?.trim() || '';
    const passed = actual === value || actual.includes(value);

    return { selector, expected: value, actual, passed, timestamp: new Date().toISOString() };
  } catch (error: any) {
    return { selector, expected: value, error: error.message, passed: false, timestamp: new Date().toISOString() };
  }
}
