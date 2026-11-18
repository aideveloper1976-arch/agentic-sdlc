import test from 'node:test';
import assert from 'node:assert/strict';
import { searchBM25, findBestMatch, filterByField } from '../src/engine/search.js';

type Doc = { id: string; name: string; description: string; category: string };
const docs: Doc[] = [
  { id: 'a', name: 'Banking dashboard', description: 'Fintech accounts and payments overview', category: 'finance' },
  { id: 'b', name: 'Recipe app', description: 'Cooking and meal planning', category: 'lifestyle' },
  { id: 'c', name: 'Crypto wallet', description: 'Digital assets', category: 'finance' },
];
const fields = [
  { field: 'name', value: 'name', weight: 2 },
  { field: 'description', value: 'description', weight: 1 },
];

test('BM25 ranks the most relevant document first', () => {
  const results = searchBM25(docs, 'fintech payments', fields, '');
  assert.equal((results[0].item as Doc).id, 'a');
});

test('BM25 drops documents with no matching terms and honours the limit', () => {
  assert.equal(searchBM25(docs, 'cooking', fields, '').length, 1);
  assert.equal(searchBM25(docs, 'zzz-no-match', fields, '').length, 0);
  assert.equal(searchBM25(docs, 'app dashboard wallet', fields, '', 2).length, 2);
});

test('findBestMatch returns the top item or undefined', () => {
  assert.equal(findBestMatch(docs, 'crypto', ['name'])?.id, 'c');
  assert.equal(findBestMatch(docs, 'nothing-here', ['name']), undefined);
});

test('filterByField is case-insensitive', () => {
  assert.deepEqual(filterByField(docs, 'category', 'FINANCE').map((d) => d.id), ['a', 'c']);
});
