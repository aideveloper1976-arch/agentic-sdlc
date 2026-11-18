import { getDb } from "./db.js";
import type {
  TraceEntity,
  TraceLink,
  TraceEvidence,
  TraceResult,
  Gap,
  TraceDirection,
} from "./types.js";

export function getEntity(entityId: string): TraceEntity {
  const db = getDb();
  const entity = db.prepare("SELECT * FROM trace_entities WHERE id = ?").get(entityId) as
    | TraceEntity
    | undefined;
  if (!entity) throw new Error(`Entity ${entityId} not found`);
  return entity;
}

export function getLinks(
  entityId: string,
  direction: TraceDirection = "both"
): { upstream: Array<{ link: TraceLink; entity: TraceEntity }>; downstream: Array<{ link: TraceLink; entity: TraceEntity }> } {
  const db = getDb();

  const upstream: Array<{ link: TraceLink; entity: TraceEntity }> = [];
  const downstream: Array<{ link: TraceLink; entity: TraceEntity }> = [];

  if (direction === "upstream" || direction === "both") {
    const fromLinks = db
      .prepare(
        `SELECT l.*, e.id as eid, e.type as etype, e.title as etitle, e.external_system, e.external_id, e.external_url, e.status as estatus, e.metadata_json, e.created_at as ecreated, e.updated_at as eupdated, e.last_synced_at, e.sync_status, e.description as edesc
         FROM trace_links l JOIN trace_entities e ON l.from_entity_id = e.id
         WHERE l.to_entity_id = ?`
      )
      .all(entityId) as Array<Record<string, unknown>>;

    for (const row of fromLinks) {
      upstream.push({
        link: rowToLink(row),
        entity: rowToEntity(row, "e"),
      });
    }
  }

  if (direction === "downstream" || direction === "both") {
    const toLinks = db
      .prepare(
        `SELECT l.*, e.id as eid, e.type as etype, e.title as etitle, e.external_system, e.external_id, e.external_url, e.status as estatus, e.metadata_json, e.created_at as ecreated, e.updated_at as eupdated, e.last_synced_at, e.sync_status, e.description as edesc
         FROM trace_links l JOIN trace_entities e ON l.to_entity_id = e.id
         WHERE l.from_entity_id = ?`
      )
      .all(entityId) as Array<Record<string, unknown>>;

    for (const row of toLinks) {
      downstream.push({
        link: rowToLink(row),
        entity: rowToEntity(row, "e"),
      });
    }
  }

  return { upstream, downstream };
}

export function getEvidence(entityId: string): TraceEvidence[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM trace_evidence WHERE entity_id = ? ORDER BY created_at DESC")
    .all(entityId) as TraceEvidence[];
}

export function getTrace(
  entityId: string,
  depth: number = 3,
  direction: TraceDirection = "both"
): TraceResult {
  const entity = getEntity(entityId);
  const evidence = getEvidence(entityId);

  const upstream: Array<{ link: TraceLink; entity: TraceEntity }> = [];
  const downstream: Array<{ link: TraceLink; entity: TraceEntity }> = [];

  const visited = new Set<string>();

  function traverse(
    currentId: string,
    currentDepth: number,
    dir: "up" | "down"
  ): void {
    if (currentDepth <= 0 || visited.has(currentId)) return;
    visited.add(currentId);

    const links = getLinks(currentId, dir === "up" ? "upstream" : "downstream");

    if (dir === "up") {
      for (const item of links.upstream) {
        upstream.push(item);
        traverse(item.entity.id, currentDepth - 1, "up");
      }
    } else {
      for (const item of links.downstream) {
        downstream.push(item);
        traverse(item.entity.id, currentDepth - 1, "down");
      }
    }
  }

  if (direction === "upstream" || direction === "both") {
    visited.clear();
    traverse(entityId, depth, "up");
  }

  if (direction === "downstream" || direction === "both") {
    visited.clear();
    traverse(entityId, depth, "down");
  }

  const gaps = detectGaps(entity, upstream, downstream, evidence);

  return { entity, upstream, downstream, evidence, gaps };
}

export function detectGaps(
  entity: TraceEntity,
  upstream: Array<{ link: TraceLink; entity: TraceEntity }>,
  downstream: Array<{ link: TraceLink; entity: TraceEntity }>,
  evidence: TraceEvidence[]
): Gap[] {
  const gaps: Gap[] = [];
  const upstreamTypes = upstream.map((u) => u.entity.type);
  const downstreamTypes = downstream.map((d) => d.entity.type);
  const evidenceTypes = evidence.map((e) => e.evidence_type);

  let metadata: Record<string, unknown> = {};
  try {
    if (entity.metadata_json) metadata = JSON.parse(entity.metadata_json);
  } catch { /* ignore */ }

  const labels: string[] = Array.isArray(metadata.labels) ? metadata.labels : [];
  const labelSet = new Set(labels.map((l: string) => l.toLowerCase()));

  if (entity.type === "story" && !upstreamTypes.includes("feature")) {
    gaps.push({
      type: "missing_upstream_feature",
      severity: "high",
      message: `Story "${entity.title}" is not linked to any Feature`,
      fromEntityId: entity.id,
      fromEntityType: "story",
      toEntityType: "feature",
    });
  }

  if (entity.type === "feature" && !upstreamTypes.includes("epic")) {
    gaps.push({
      type: "missing_upstream_epic",
      severity: "high",
      message: `Feature "${entity.title}" is not linked to any EPIC`,
      fromEntityId: entity.id,
      fromEntityType: "feature",
      toEntityType: "epic",
    });
  }

  if (entity.type === "epic" && !upstreamTypes.includes("research")) {
    gaps.push({
      type: "missing_research_link",
      severity: "medium",
      message: `EPIC "${entity.title}" has no upstream Research link`,
      fromEntityId: entity.id,
      fromEntityType: "epic",
      toEntityType: "research",
    });
  }

  if (
    entity.type === "story" &&
    !downstreamTypes.includes("test_result") &&
    !evidenceTypes.includes("test_result")
  ) {
    gaps.push({
      type: "missing_test_evidence",
      severity: "high",
      message: `Story "${entity.title}" has no test results or test evidence`,
      fromEntityId: entity.id,
      fromEntityType: "story",
      toEntityType: "test_result",
    });
  }

  const uiKeywords = ["ui", "frontend", "ux", "user interface", "screen", "page"];
  const isUiStory = uiKeywords.some((kw) => labelSet.has(kw) || entity.title.toLowerCase().includes(kw));

  if (isUiStory && !downstreamTypes.includes("ux_review") && !evidenceTypes.includes("ux_review")) {
    gaps.push({
      type: "missing_ux_review",
      severity: "medium",
      message: `UI/Frontend story "${entity.title}" has no UX Review`,
      fromEntityId: entity.id,
      fromEntityType: "story",
      toEntityType: "ux_review",
    });
  }

  const securityKeywords = ["auth", "security", "payment", "pii", "password", "credential", "token", "encrypt"];
  const isSecurityStory = securityKeywords.some(
    (kw) => labelSet.has(kw) || entity.title.toLowerCase().includes(kw)
  );

  if (isSecurityStory && !downstreamTypes.includes("security_review") && !evidenceTypes.includes("security_review")) {
    gaps.push({
      type: "missing_security_review",
      severity: "high",
      message: `Security-sensitive story "${entity.title}" has no Security Review`,
      fromEntityId: entity.id,
      fromEntityType: "story",
      toEntityType: "security_review",
    });
  }

  if (entity.type === "release") {
    const hasLinkedTests =
      downstreamTypes.includes("test_result") ||
      upstreamTypes.some((t) => t === "test_result");
    if (!hasLinkedTests) {
      gaps.push({
        type: "release_missing_tests",
        severity: "high",
        message: `Release "${entity.title}" has no linked test results`,
        fromEntityId: entity.id,
        fromEntityType: "release",
        toEntityType: "test_result",
      });
    }

    if (!downstreamTypes.includes("security_review") && !evidenceTypes.includes("security_review")) {
      gaps.push({
        type: "release_missing_security",
        severity: "high",
        message: `Release "${entity.title}" has no linked security review`,
        fromEntityId: entity.id,
        fromEntityType: "release",
        toEntityType: "security_review",
      });
    }
  }

  return gaps;
}

export function searchTraceEntities(
  query: string,
  types?: string[],
  limit: number = 20
): TraceEntity[] {
  const db = getDb();
  const like = `%${query}%`;

  let sql = `SELECT * FROM trace_entities WHERE (title LIKE ? OR description LIKE ? OR external_id LIKE ? OR external_url LIKE ?)`;
  const params: string[] = [like, like, like, like];

  if (types && types.length > 0) {
    const placeholders = types.map(() => "?").join(",");
    sql += ` AND type IN (${placeholders})`;
    params.push(...types);
  }

  sql += ` ORDER BY updated_at DESC LIMIT ?`;
  params.push(String(limit));

  return db.prepare(sql).all(...params) as TraceEntity[];
}

function rowToLink(row: Record<string, unknown>): TraceLink {
  return {
    id: row.id as string,
    from_entity_id: row.from_entity_id as string,
    to_entity_id: row.to_entity_id as string,
    link_type: row.link_type as import("./types.js").LinkType,
    rationale: (row.rationale as string) || null,
    metadata_json: (row.metadata_json as string) || null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToEntity(row: Record<string, unknown>, prefix: string): TraceEntity {
  return {
    id: row[`${prefix}id`] as string,
    type: row[`${prefix}type`] as import("./types.js").EntityType,
    external_system: (row[`${prefix}external_system`] as string) || null,
    external_id: (row[`${prefix}external_id`] as string) || null,
    external_url: (row[`${prefix}external_url`] as string) || null,
    title: row[`${prefix}title`] as string,
    description: (row[`${prefix}desc`] as string) || null,
    status: (row[`${prefix}status`] as string) || null,
    metadata_json: (row[`${prefix}metadata_json`] as string) || null,
    created_at: row[`${prefix}created`] as string,
    updated_at: row[`${prefix}updated`] as string,
    last_synced_at: (row[`${prefix}last_synced_at`] as string) || null,
    sync_status: (row[`${prefix}sync_status`] as "local" | "synced" | "pending_sync" | "pending_create" | "error") || "local",
  };
}
