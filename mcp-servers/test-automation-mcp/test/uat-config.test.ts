import test from 'node:test';
import assert from 'node:assert/strict';

import { buildUatRuntimeConfig } from '../src/uat-config.js';

test('buildUatRuntimeConfig reads headed and artifact settings from env', () => {
  const result = buildUatRuntimeConfig({
    HEADED_ALLOWED: 'true',
    VIDEO: 'true',
    TRACE: 'false',
    SLOW_MO_MS: '250',
    UAT_EVIDENCE_DIR: 'docs/product/evidence/uat',
    DOM_SNAPSHOT_DIR: 'docs/product/evidence/uat/dom',
  });

  assert.equal(result.headedAllowed, true);
  assert.equal(result.videoEnabled, true);
  assert.equal(result.traceEnabled, false);
  assert.equal(result.slowMoMs, 250);
  assert.match(result.uatEvidenceDir, /docs[\\/]product[\\/]evidence[\\/]uat$/i);
  assert.match(result.domSnapshotDir, /docs[\\/]product[\\/]evidence[\\/]uat[\\/]dom$/i);
});

test('buildUatRuntimeConfig applies safe defaults', () => {
  const result = buildUatRuntimeConfig({});

  assert.equal(result.headedAllowed, false);
  assert.equal(result.videoEnabled, true);
  assert.equal(result.traceEnabled, true);
  assert.equal(result.slowMoMs, 0);
});
