export type EntityType =
  | "idea"
  | "research"
  | "epic"
  | "feature"
  | "story"
  | "code_change"
  | "test_result"
  | "ux_review"
  | "security_review"
  | "release"
  | "decision"
  | "risk"
  | "dependency";

export type LinkType =
  | "derived_from"
  | "decomposes_to"
  | "implemented_by"
  | "validated_by"
  | "reviewed_by"
  | "secured_by"
  | "released_in"
  | "depends_on"
  | "mitigates"
  | "documents"
  | "relates_to";

export type SyncStatus = "local" | "synced" | "pending_sync" | "pending_create" | "error";

export type TraceDirection = "upstream" | "downstream" | "both";

export type ReportFormat = "markdown" | "json";

export interface TraceEntity {
  id: string;
  type: EntityType;
  external_system: string | null;
  external_id: string | null;
  external_url: string | null;
  title: string;
  description: string | null;
  status: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  sync_status: SyncStatus;
}

export interface TraceLink {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  link_type: LinkType;
  rationale: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraceEvidence {
  id: string;
  entity_id: string;
  evidence_type: string;
  title: string;
  source_url: string | null;
  file_path: string | null;
  summary: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface TraceResult {
  entity: TraceEntity;
  upstream: Array<{ link: TraceLink; entity: TraceEntity }>;
  downstream: Array<{ link: TraceLink; entity: TraceEntity }>;
  evidence: TraceEvidence[];
  gaps: Gap[];
}

export interface Gap {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  fromEntityId?: string;
  toEntityId?: string;
  fromEntityType?: string;
  toEntityType?: string;
}

export interface TraceReport {
  entity: TraceEntity;
  upstream: Array<{ link: TraceLink; entity: TraceEntity }>;
  downstream: Array<{ link: TraceLink; entity: TraceEntity }>;
  evidence: TraceEvidence[];
  gaps: Gap[];
  recommendations: string[];
  generatedAt: string;
  reportPath?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  url: string;
  summary: string;
  description: string | null;
  status: string;
  type: string;
  labels: string[];
  parentKey: string | null;
  issueLinks: Array<{
    type: string;
    outwardKey?: string;
    inwardKey?: string;
  }>;
}

export interface ConfluencePage {
  id: string;
  title: string;
  url: string;
  space: string;
  version: number;
  lastModified: string;
  content: string | null;
}
