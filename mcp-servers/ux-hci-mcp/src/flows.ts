import { Page } from 'playwright';
import { UserFlowResult, FlowStep, JourneyResult, JourneyStep, FormAnalysisResult, FormField, UIIssue } from './types.js';
import path from 'path';
import { config } from './config.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

export async function analyzeUserFlow(page: Page, url: string, flowName: string): Promise<UserFlowResult> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const flowInfo = await page.evaluate((name) => {
    const steps: any[] = [];
    let stepNumber = 1;

    steps.push({
      stepNumber: stepNumber++,
      action: `View ${name} page`,
      selector: 'body',
      url: window.location.href,
      isDecisionPoint: false,
    });

    const links = document.querySelectorAll('a[href]:not([href="#"]):not([href=""]):not([href^="javascript"])');
    links.forEach(link => {
      const text = (link as HTMLElement).innerText?.trim();
      if (text && text.length > 0) {
        steps.push({
          stepNumber: stepNumber++,
          action: `Click "${text}" link`,
          selector: '',
          url: link.getAttribute('href') || '',
          isDecisionPoint: true,
        });
      }
    });

    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
    buttons.forEach(btn => {
      const text = (btn as HTMLElement).innerText?.trim() || (btn as HTMLInputElement).value || 'submit';
      steps.push({
        stepNumber: stepNumber++,
        action: `Click "${text}" button`,
        selector: '',
        url: window.location.href,
        isDecisionPoint: true,
      });
    });

    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
      steps.push({
        stepNumber: stepNumber++,
        action: `Fill form with ${inputs.length} fields`,
        selector: form.id ? `#${form.id}` : 'form',
        url: form.action || window.location.href,
        isDecisionPoint: true,
      });
    });

    return steps;
  }, flowName);

  const decisionPoints = flowInfo.filter((s: any) => s.isDecisionPoint).length;
  const estimatedClicks = Math.min(flowInfo.length - 1, Math.ceil(flowInfo.length / 2));
  const cognitiveLoad = estimatedClicks > 10 ? 'high' : estimatedClicks > 5 ? 'medium' : 'low';

  const frictionAreas: string[] = [];
  if (decisionPoints > 7) {
    frictionAreas.push(`Too many decision points (${decisionPoints}) — users may experience choice overload and decision fatigue.`);
  }
  if (estimatedClicks > 10) {
    frictionAreas.push(`High interaction count (${estimatedClicks} estimated clicks) — consider consolidating steps or using progressive disclosure.`);
  }
  if (cognitiveLoad === 'high') {
    frictionAreas.push('Cognitive load is high — simplify the flow by reducing options and providing clear guidance.');
  }

  return {
    url,
    flowName,
    totalSteps: flowInfo.length,
    decisionPoints,
    estimatedClicks,
    cognitiveLoad,
    steps: flowInfo,
    frictionAreas,
  };
}

export async function captureUserJourney(
  page: Page,
  url: string,
  steps: Array<{ action: string; selector?: string; value?: string; wait?: number }>
): Promise<JourneyResult> {
  const journeySteps: JourneyStep[] = [];
  const errors: string[] = [];
  const screenshotPaths: string[] = [];
  const screenshotsDir = path.join(config.screenshotsPath, uuidv4());

  fs.mkdirSync(screenshotsDir, { recursive: true });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const initialScreenshot = path.join(screenshotsDir, 'step-0.png');
  await page.screenshot({ path: initialScreenshot, fullPage: true });
  screenshotPaths.push(initialScreenshot);

  let totalDuration = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const startTime = Date.now();
    const journeyStep: JourneyStep = {
      stepNumber: i + 1,
      action: step.action,
      url: page.url(),
      duration: 0,
    };

    try {
      if (step.selector) {
        const el = await page.waitForSelector(step.selector, { timeout: 5000 });
        if (step.value !== undefined) {
          await el.fill(step.value);
          await page.waitForTimeout(200);
        } else {
          await el.click();
        }
      }

      if (step.wait) {
        await page.waitForTimeout(step.wait);
      } else {
        await page.waitForTimeout(500);
      }

      const screenshotPath = path.join(screenshotsDir, `step-${i + 1}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshotPaths.push(screenshotPath);
      journeyStep.screenshot = screenshotPath;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      journeyStep.errors = [errorMsg];
      errors.push(`Step ${i + 1} (${step.action}): ${errorMsg}`);
    }

    journeyStep.duration = Date.now() - startTime;
    totalDuration += journeyStep.duration;
    journeySteps.push(journeyStep);
  }

  return {
    url,
    steps: journeySteps,
    totalDuration,
    success: errors.length === 0,
    errors,
    screenshotPaths,
  };
}

export async function analyzeForms(page: Page, url: string): Promise<FormAnalysisResult> {
  await page.goto(url, { waitUntil: 'networkidle' });

  const formData = await page.evaluate(() => {
    const forms: any[] = [];

    document.querySelectorAll('form').forEach(form => {
      const fields: any[] = [];
      const issues: any[] = [];

      form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
        const field = el as HTMLInputElement;
        const id = field.id;
        let labelText: string | undefined;

        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) labelText = label.textContent?.trim();
        }

        if (!labelText) {
          const parentLabel = field.closest('label');
          if (parentLabel) {
            labelText = parentLabel.textContent?.trim();
          }
        }

        if (!labelText && !field.hasAttribute('aria-label')) {
          issues.push({
            type: 'missing_label',
            severity: 'high',
            description: `Form field missing label: <${field.tagName.toLowerCase()}${field.name ? ' name="' + field.name + '"' : ''}>`,
            recommendation: 'Add a label element or aria-label to this field.',
            selector: field.tagName.toLowerCase() + (field.name ? `[name="${field.name}"]` : ''),
          });
        }

        const validation: string[] = [];
        if (field.pattern) validation.push(`pattern: ${field.pattern}`);
        if (field.minLength !== -1 && field.minLength) validation.push(`minLength: ${field.minLength}`);
        if (field.maxLength !== -1 && field.maxLength) validation.push(`maxLength: ${field.maxLength}`);
        if (field.type === 'email') validation.push('email');
        if (field.type === 'url') validation.push('url');
        if (field.type === 'tel') validation.push('tel');

        fields.push({
          selector: field.tagName.toLowerCase() + (field.name ? `[name="${field.name}"]` : ''),
          type: field.type || field.tagName.toLowerCase(),
          name: field.name,
          label: labelText,
          required: field.required || field.hasAttribute('aria-required'),
          validation: validation.length > 0 ? validation.join(', ') : undefined,
          hasError: field.matches(':invalid'),
          placeholder: field.placeholder,
        });
      });

      forms.push({
        selector: form.id ? `#${form.id}` : 'form' + (form.action ? `[action="${form.action}"]` : ''),
        action: form.action || undefined,
        method: (form.method || 'get').toUpperCase(),
        fields,
        issues,
      });
    });

    return forms;
  });

  return {
    url,
    forms: formData,
  };
}
