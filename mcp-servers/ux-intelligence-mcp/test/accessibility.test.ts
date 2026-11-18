import test from 'node:test';
import assert from 'node:assert/strict';
import { checkContrast } from '../src/engine/accessibility.js';

test('black on white is the maximum 21:1 ratio and passes AAA', () => {
  const r = checkContrast('#000000', '#FFFFFF');
  assert.equal(r.ratio, 21);
  assert.equal(r.passesAA, true);
  assert.equal(r.passesAAA, true);
});

test('ratio is symmetric in foreground and background', () => {
  assert.equal(checkContrast('#336699', '#FFFFFF').ratio, checkContrast('#FFFFFF', '#336699').ratio);
});

test('mid-grey on white fails AA for body text but passes for large text', () => {
  const body = checkContrast('#949494', '#FFFFFF');
  assert.equal(body.passesAA, false);
  assert.equal(body.passesAA18, true);
  const large = checkContrast('#949494', '#FFFFFF', 24);
  assert.equal(large.passesAA, true);
});

test('identical colours have a 1:1 ratio and fail everything', () => {
  const r = checkContrast('#777777', '#777777');
  assert.equal(r.ratio, 1);
  assert.equal(r.passesAA18, false);
  assert.match(r.recommendation, /Fails WCAG AA/);
});
