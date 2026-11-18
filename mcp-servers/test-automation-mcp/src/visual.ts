import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { v4 as uuidv4 } from 'uuid';
import { VisualRegressionResult } from './types.js';
import { config } from './config.js';
import { PlaywrightManager } from './playwright.js';

const DEFAULT_THRESHOLD = 0.1;

export async function captureScreenshot(url: string, name: string): Promise<string> {
  const manager = new PlaywrightManager();

  try {
    await manager.launch();
    await manager.navigate(url);

    await manager.getPage()?.waitForTimeout(1000);

    const screenshotPath = await manager.captureScreenshot(name);
    if (!screenshotPath) {
      throw new Error('Failed to capture screenshot');
    }

    return screenshotPath;
  } finally {
    await manager.close();
  }
}

export async function compareScreenshots(
  currentBuffer: Buffer,
  baselinePath: string,
): Promise<{
  diffBuffer: Buffer;
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
}> {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline image not found: ${baselinePath}`);
  }

  const baselineBuffer = fs.readFileSync(baselinePath);

  const currentMeta = await sharp(currentBuffer).metadata();
  const baselineMeta = await sharp(baselineBuffer).metadata();

  const width = Math.max(currentMeta.width || 0, baselineMeta.width || 0);
  const height = Math.max(currentMeta.height || 0, baselineMeta.height || 0);

  if (width === 0 || height === 0) {
    throw new Error('Invalid image dimensions');
  }

  const currentRaw = await sharp(currentBuffer)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const baselineRaw = await sharp(baselineBuffer)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const diffOutput = new Uint8ClampedArray(width * height * 4);

  const diffPixels = pixelmatch(
    new Uint8ClampedArray(currentRaw.buffer, currentRaw.byteOffset, currentRaw.byteLength),
    new Uint8ClampedArray(baselineRaw.buffer, baselineRaw.byteOffset, baselineRaw.byteLength),
    diffOutput,
    width,
    height,
    { threshold: DEFAULT_THRESHOLD, includeAA: true },
  );

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  const diffBuffer = await sharp(Buffer.from(diffOutput.buffer, diffOutput.byteOffset, diffOutput.byteLength), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return { diffBuffer, diffPixels, totalPixels, diffPercent };
}

export async function runVisualRegression(
  url: string,
  baselineImagePath: string,
): Promise<VisualRegressionResult> {
  const manager = new PlaywrightManager();

  try {
    await manager.launch();
    await manager.navigate(url);
    await manager.getPage()?.waitForTimeout(1000);

    const currentBuffer = await manager.captureScreenshotBuffer();
    if (!currentBuffer) {
      throw new Error('Failed to capture current screenshot');
    }

    const { diffBuffer, diffPixels, totalPixels, diffPercent } = await compareScreenshots(
      currentBuffer,
      baselineImagePath,
    );

    const visualDir = config.visualDir;
    fs.mkdirSync(visualDir, { recursive: true });

    const timestamp = Date.now();
    const currentPath = path.join(visualDir, `current-${timestamp}-${uuidv4().slice(0, 8)}.png`);
    const diffPath = path.join(visualDir, `diff-${timestamp}-${uuidv4().slice(0, 8)}.png`);

    await sharp(currentBuffer).png().toFile(currentPath);
    await sharp(diffBuffer).png().toFile(diffPath);

    const threshold = DEFAULT_THRESHOLD;

    return {
      url,
      baselinePath: baselineImagePath,
      currentPath,
      diffPath,
      diffPixels,
      totalPixels,
      diffPercent: Math.round(diffPercent * 100) / 100,
      passed: diffPercent <= 1.0,
      threshold,
    };
  } finally {
    await manager.close();
  }
}
