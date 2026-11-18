import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCommand } from '../src/allowlist.js';

test('allows common test commands', () => {
  assert.equal(validateCommand('npm', ['test']).allowed, true);
  assert.equal(validateCommand('git', ['status']).allowed, true);
});

test('rejects commands that are not on the allowlist', () => {
  const r = validateCommand('curl', ['https://example.com']);
  assert.equal(r.allowed, false);
  assert.match(r.reason ?? '', /not in allowlist/);
});

test('rejects path-based execution', () => {
  const r = validateCommand('./evil.sh', []);
  assert.equal(r.allowed, false);
  assert.match(r.reason ?? '', /Path-based/);
});

test('blocks destructive git subcommands that are not on the subcommand allowlist', () => {
  assert.equal(validateCommand('git', ['reset', '--hard']).allowed, false);
  assert.equal(validateCommand('git', ['clean', '-fdx']).allowed, false);
});

test('blocks npm subcommands outside the allowlist', () => {
  assert.equal(validateCommand('npm', ['publish']).allowed, false);
});
