const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS trace_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  external_system TEXT,
  external_id TEXT,
  external_url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_external
  ON trace_entities(external_system, external_id)
  WHERE external_system IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entities_type ON trace_entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_status ON trace_entities(status);

CREATE TABLE IF NOT EXISTS trace_links (
  id TEXT PRIMARY KEY,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  rationale TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (from_entity_id) REFERENCES trace_entities(id),
  FOREIGN KEY (to_entity_id) REFERENCES trace_entities(id)
);

CREATE INDEX IF NOT EXISTS idx_links_from ON trace_links(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_links_to ON trace_links(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_links_type ON trace_links(link_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_links_unique
  ON trace_links(from_entity_id, to_entity_id, link_type);

CREATE TABLE IF NOT EXISTS trace_evidence (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT,
  file_path TEXT,
  summary TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (entity_id) REFERENCES trace_entities(id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_entity ON trace_evidence(entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON trace_evidence(evidence_type);

CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_type ON sync_log(sync_type);
`;

export function getSchema(): string {
  return SCHEMA_SQL;
}
