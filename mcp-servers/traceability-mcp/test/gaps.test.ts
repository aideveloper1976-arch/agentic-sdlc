import test from 'node:test';
import assert from 'node:assert/strict';
import { detectGaps } from '../src/traceability.js';
import type { TraceEntity, TraceLink, TraceEvidence } from '../src/types.js';

const now = new Date().toISOString();
const entity = (id: string, type: string, extra: Partial<TraceEntity> = {}): TraceEntity =>
  ({ id, type, title: `${type} ${id}`, created_at: now, updated_at: now, sync_status: 'local', ...extra }) as TraceEntity;
const link = (from: string, to: string): TraceLink =>
  ({ id: `${from}->${to}`, from_entity_id: from, to_entity_id: to, link_type: 'implements', created_at: now, updated_at: now }) as TraceLink;

test('a story with no parent feature is a high-severity gap', () => {
  const gaps = detectGaps(entity('S1', 'story'), [], [], []);
  const g = gaps.find((x) => x.type === 'missing_upstream_feature');
  assert.ok(g, 'expected missing_upstream_feature gap');
  assert.equal(g.severity, 'high');
});

test('a story linked to a feature has no missing-feature gap', () => {
  const up = [{ link: link('F1', 'S1'), entity: entity('F1', 'feature') }];
  const gaps = detectGaps(entity('S1', 'story'), up, [], []);
  assert.equal(gaps.some((x) => x.type === 'missing_upstream_feature'), false);
});

test('a feature without an epic and an epic without research are flagged', () => {
  assert.ok(detectGaps(entity('F1', 'feature'), [], [], []).some((g) => g.type === 'missing_upstream_epic'));
  const epicGaps = detectGaps(entity('E1', 'epic'), [], [], []);
  const research = epicGaps.find((g) => g.type === 'missing_research_link');
  assert.equal(research?.severity, 'medium');
});

test('evidence list is accepted without throwing', () => {
  const ev = [{ id: 'ev1', entity_id: 'S1', evidence_type: 'test_result', title: 'unit tests', created_at: now }] as TraceEvidence[];
  assert.doesNotThrow(() => detectGaps(entity('S1', 'story'), [], [], ev));
});
