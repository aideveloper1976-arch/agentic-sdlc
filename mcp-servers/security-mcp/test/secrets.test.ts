import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanSecrets } from '../src/secrets.js';

function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secmcp-'));
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
  return dir;
}

// Built at runtime so this test file itself never contains a scannable secret.
const fakeAwsKey = 'AKIA' + 'Z'.repeat(16);

test('detects a hardcoded AWS access key', async () => {
  const dir = fixture({ 'config.ts': `export const key = "${fakeAwsKey}";\n` });
  const { findings } = await scanSecrets(dir);
  assert.ok(findings.length > 0, 'expected at least one finding');
});

test('a clean project yields no findings', async () => {
  const dir = fixture({ 'index.ts': 'export const answer = 42;\n' });
  const { findings } = await scanSecrets(dir);
  assert.equal(findings.length, 0);
});
