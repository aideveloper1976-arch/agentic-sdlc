import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const config = {
  allowedDomains: (process.env.ALLOWED_DOMAINS || 'localhost,127.0.0.1,*.local,*.test').split(',').map(d => d.trim()),
  headless: process.env.HEADLESS !== 'false',
  evidencePath: path.resolve(process.env.EVIDENCE_PATH || path.join(rootDir, 'docs', 'product', 'evidence')),
  uxPath: path.resolve(process.env.EVIDENCE_PATH || path.join(rootDir, 'docs', 'product', 'evidence'), 'ux'),
  hciPath: path.resolve(process.env.EVIDENCE_PATH || path.join(rootDir, 'docs', 'product', 'evidence'), 'hci'),
  screenshotsPath: path.resolve(process.env.EVIDENCE_PATH || path.join(rootDir, 'docs', 'product', 'evidence'), 'screenshots'),
};
