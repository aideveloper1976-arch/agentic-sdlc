import { PlaywrightManager } from './playwright.js';
import type { Page, Request, Response } from 'playwright';

interface CapturedRequest {
  index: number;
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timing: number;
  resourceType: string;
}

interface CapturedData {
  capturedRequests: CapturedRequest[];
  capturedRequestCount: number;
}

let globalCapturedData: CapturedData = { capturedRequests: [], capturedRequestCount: 0 };

export function setupNetworkCapture(page: Page, includeStatic: boolean, filterRegex: RegExp | null): void {
  const requests: CapturedRequest[] = [];
  let index = 0;

  page.on('response', async (response: Response) => {
    const req = response.request();
    const resourceType = req.resourceType();

    if (!includeStatic && ['image', 'font', 'stylesheet', 'script', 'media'].includes(resourceType)) {
      return;
    }
    if (filterRegex && !filterRegex.test(req.url())) {
      return;
    }

    index++;
    const captured: CapturedRequest = {
      index,
      url: req.url(),
      method: req.method(),
      status: response.status(),
      statusText: response.statusText(),
      requestHeaders: req.headers(),
      responseHeaders: response.headers(),
      timing: 0,
      resourceType,
    };

    try {
      captured.requestBody = req.postData() || undefined;
    } catch { /* ignore */ }

    try {
      captured.responseBody = (await response.text()).slice(0, 50000);
    } catch { /* ignore */ }

    requests.push(captured);
  });

  globalCapturedData = { capturedRequests: requests, capturedRequestCount: 0 };
}

export async function inspectNetwork(
  manager: PlaywrightManager,
  url: string,
  includeStatic: boolean = false,
  filter?: string
) {
  await manager.launch();
  const page = manager.getPage();
  if (!page) throw new Error('Browser not launched');

  const filterRegex = filter ? new RegExp(filter, 'i') : null;
  setupNetworkCapture(page, includeStatic, filterRegex);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  return {
    url,
    totalRequests: globalCapturedData.capturedRequests.length,
    requests: globalCapturedData.capturedRequests,
  };
}

export function getInspectedNetworkRequest(index: number) {
  if (index < 1 || index > globalCapturedData.capturedRequests.length) {
    throw new Error(`Request index ${index} out of range (1-${globalCapturedData.capturedRequests.length})`);
  }
  return globalCapturedData.capturedRequests[index - 1];
}
