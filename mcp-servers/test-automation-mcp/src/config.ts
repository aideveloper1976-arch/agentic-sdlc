import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppConfig } from './types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const screenshotDir = path.resolve(process.env.SCREENSHOT_DIR || path.join(rootDir, 'docs/product/evidence/tests'));
const evidenceDir = path.resolve(process.env.EVIDENCE_DIR || path.join(rootDir, 'docs/product/evidence'));
const uatEvidenceDir = path.resolve(process.env.UAT_EVIDENCE_DIR || path.join(evidenceDir, 'uat'));
const domSnapshotDir = path.resolve(process.env.DOM_SNAPSHOT_DIR || path.join(uatEvidenceDir, 'dom'));

export const config: AppConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost',
  allowedDomains: (process.env.ALLOWED_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean),
  defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT_MS || '30000', 10),
  navigationMaxDepth: parseInt(process.env.NAVIGATION_MAX_DEPTH || '5', 10),
  headless: process.env.HEADLESS !== 'false',
  headedAllowed: process.env.HEADED_ALLOWED === 'true',
  videoEnabled: process.env.VIDEO !== 'false',
  traceEnabled: process.env.TRACE !== 'false',
  slowMoMs: parseInt(process.env.SLOW_MO_MS || '0', 10),
  screenshotDir,
  evidenceDir,
  uxDir: path.resolve(process.env.UX_DIR || path.join(evidenceDir, 'ux')),
  visualDir: path.resolve(process.env.VISUAL_DIR || path.join(evidenceDir, 'visual')),
  uatEvidenceDir,
  domSnapshotDir,
};

export function validateUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only http and https protocols are allowed' };
    }

    if (config.allowedDomains.length === 0) {
      const allowed = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!allowed) {
        return { valid: false, reason: 'Only localhost URLs are allowed. Set ALLOWED_DOMAINS to permit external hosts.' };
      }
      return { valid: true };
    }

    const isAllowed = config.allowedDomains.some(
      domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return { valid: false, reason: `Domain "${parsed.hostname}" is not in the allowed list.` };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

export function resolveUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = config.baseUrl.replace(/\/+$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}
