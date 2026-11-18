import { SearchResult } from "../types.js";

interface DocField {
  field: string;
  value: string;
  weight: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/).filter(Boolean);
}

function computeBM25(docTokens: string[], queryTokens: string[], avgDocLen: number, docLen: number, N: number, df: Map<string, number>): number {
  const k1 = 1.5;
  const b = 0.75;
  let score = 0;
  for (const qt of queryTokens) {
    const tf = docTokens.filter((t) => t === qt).length;
    if (tf === 0) continue;
    const idf = Math.log((N - (df.get(qt) || 0) + 0.5) / ((df.get(qt) || 0) + 0.5) + 1);
    score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
  }
  return score;
}

export function searchBM25<T>(
  items: T[],
  query: string,
  fields: DocField[],
  dataDir: string,
  limit: number = 10
): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const N = items.length;
  const docLengths: number[] = [];
  const allTokens: string[][] = [];
  const df = new Map<string, number>();

  for (const item of items) {
    const fieldText = fields
      .filter((f) => f.field === "*" || (item as Record<string, unknown>)[f.field])
      .map((f) => {
        const val = (item as Record<string, unknown>)[f.field === "*" ? Object.keys(item as object)[0] : f.field];
        return typeof val === "string" ? val : Array.isArray(val) ? val.join(" ") : String(val || "");
      })
      .join(" ");
    const tokens = tokenize(fieldText);
    allTokens.push(tokens);
    docLengths.push(tokens.length);
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }

  const avgDocLen = docLengths.reduce((a, b) => a + b, 0) / Math.max(N, 1);

  const scored: SearchResult[] = items.map((item, i) => {
    let score = 0;
    for (const f of fields) {
      const val = (item as Record<string, unknown>)[f.field];
      const text = typeof val === "string" ? val : Array.isArray(val) ? val.join(" ") : String(val || "");
      const fieldTokens = tokenize(text);
      const fieldScore = computeBM25(fieldTokens, queryTokens, avgDocLen, fieldTokens.length, N, df);
      score += fieldScore * f.weight;
    }
    return { item, score, field: fields[0]?.field || "" };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findBestMatch<T>(
  items: T[],
  query: string,
  searchFields: string[],
  sortKey?: string
): T | undefined {
  const fields: DocField[] = searchFields.map((f) => ({ field: f, value: f, weight: 1 }));
  const results = searchBM25(items, query, fields, "");
  if (results.length === 0) return undefined;
  const best = results[0].item as T;
  return best;
}

export function filterByField<T>(items: T[], field: keyof T, value: string): T[] {
  if (!value) return items;
  const q = value.toLowerCase();
  return items.filter((item) => {
    const v = String(item[field] ?? "").toLowerCase();
    return v.includes(q) || v === q;
  });
}
