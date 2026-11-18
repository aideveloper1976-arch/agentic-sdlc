import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCsv } from '../src/parsers/csv.js';
import { parseMarkdown } from '../src/parsers/markdown.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-'));

test('parses a CSV file into text', async () => {
  const f = path.join(tmp, 'reqs.csv');
  fs.writeFileSync(f, 'id,requirement\nR1,Users can export reports\nR2,Admins can invite users\n');
  const { text } = await parseCsv(f);
  assert.match(text, /export reports/);
  assert.match(text, /invite users/);
});

test('parses a Markdown file into text', async () => {
  const f = path.join(tmp, 'spec.md');
  fs.writeFileSync(f, '# Spec\n\nThe system must send a weekly digest.\n');
  const { text } = await parseMarkdown(f);
  assert.match(text, /weekly digest/);
});
