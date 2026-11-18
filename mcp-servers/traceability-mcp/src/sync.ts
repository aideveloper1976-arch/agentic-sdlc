import { v4 as uuid } from "uuid";
import { getDb } from "./db.js";
import { searchJiraIssues, getJiraIssue } from "./jira.js";
import { searchConfluencePages, getConfluencePage } from "./confluence.js";
import { config } from "./config.js";
import type { TraceEntity, EntityType } from "./types.js";

function jiraTypeToEntityType(jiraType: string): EntityType {
  switch (jiraType.toLowerCase()) {
    case "epic":
      return "epic";
    case "story":
      return "story";
    case "task":
      return "story";
    case "bug":
      return "risk";
    case "sub-task":
      return "story";
    default:
      return "story";
  }
}

export async function syncFromJira(
  jql?: string,
  projectKey?: string,
  maxResults: number = 50
): Promise<{ imported: number; updated: number; errors: string[] }> {
  const db = getDb();
  const project = projectKey || config.jiraProjectKey;
  const query = jql || `project=${project} ORDER BY updated DESC`;

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    const issues = await searchJiraIssues(query, maxResults);

    const upsertStmt = db.prepare(`
      INSERT INTO trace_entities (id, type, external_system, external_id, external_url, title, description, status, metadata_json, created_at, updated_at, last_synced_at, sync_status)
      VALUES (@id, @type, @external_system, @external_id, @external_url, @title, @description, @status, @metadata_json, @created_at, @updated_at, @last_synced_at, @sync_status)
      ON CONFLICT(external_system, external_id) WHERE external_system IS NOT NULL AND external_id IS NOT NULL
      DO UPDATE SET title = @title, description = @description, status = @status, metadata_json = @metadata_json, updated_at = @updated_at, last_synced_at = @last_synced_at, sync_status = @sync_status
    `);

    const linkStmt = db.prepare(`
      INSERT OR IGNORE INTO trace_links (id, from_entity_id, to_entity_id, link_type, rationale, created_at, updated_at)
      VALUES (@id, @from, @to, @type, @rationale, @now, @now)
    `);

    const tx = db.transaction(() => {
      for (const issue of issues) {
        const type = jiraTypeToEntityType(issue.type);
        const now = new Date().toISOString();

        const metadata = JSON.stringify({
          labels: issue.labels,
          jiraType: issue.type,
          issueLinks: issue.issueLinks,
        });

        const existing = db
          .prepare("SELECT id FROM trace_entities WHERE external_system = ? AND external_id = ?")
          .get("jira", issue.key) as { id: string } | undefined;

        const entityId = existing?.id || uuid();
        const entity: TraceEntity = {
          id: entityId,
          type,
          external_system: "jira",
          external_id: issue.key,
          external_url: issue.url,
          title: issue.summary,
          description: issue.description,
          status: issue.status,
          metadata_json: metadata,
          created_at: now,
          updated_at: now,
          last_synced_at: now,
          sync_status: "synced",
        };

        upsertStmt.run(entity);

        if (existing) updated++;
        else imported++;

        if (issue.parentKey) {
          const parentId = uuid();
          const parentExisting = db
            .prepare("SELECT id FROM trace_entities WHERE external_system = ? AND external_id = ?")
            .get("jira", issue.parentKey) as { id: string } | undefined;

          if (parentExisting) {
            linkStmt.run({
              id: uuid(),
              from: entityId,
              to: parentExisting.id,
              type: "decomposes_to",
              rationale: `Jira parent link: ${issue.key} → ${issue.parentKey}`,
              now,
            });
          }
        }
      }
    });

    tx();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
  }

  return { imported, updated, errors };
}

export async function syncToJira(
  entityId: string,
  createIfMissing: boolean = false
): Promise<{ jiraKey: string; jiraUrl: string; action: "created" | "updated" | "none" }> {
  const db = getDb();
  const entity = db.prepare("SELECT * FROM trace_entities WHERE id = ?").get(entityId) as
    | TraceEntity
    | undefined;

  if (!entity) {
    throw new Error(`Entity ${entityId} not found`);
  }

  if (entity.external_id && entity.external_system === "jira") {
    const { updateJiraIssue } = await import("./jira.js");
    const fields: Record<string, unknown> = { summary: entity.title };
    if (entity.description) {
      fields.description = entity.description;
    }
    await updateJiraIssue(entity.external_id, fields);

    db.prepare(
      "UPDATE trace_entities SET last_synced_at = ?, sync_status = ? WHERE id = ?"
    ).run(new Date().toISOString(), "synced", entityId);

    return {
      jiraKey: entity.external_id,
      jiraUrl: entity.external_url || "",
      action: "updated",
    };
  }

  if (createIfMissing) {
    const { createJiraIssue } = await import("./jira.js");
    const issueTypeMap: Record<string, string> = {
      epic: "Epic",
      feature: "Story",
      story: "Story",
      risk: "Bug",
      decision: "Task",
    };
    const issueType = issueTypeMap[entity.type] || "Story";

    const result = await createJiraIssue({
      projectKey: config.jiraProjectKey,
      summary: entity.title,
      description: entity.description || undefined,
      issueType,
    });

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE trace_entities SET external_system = 'jira', external_id = ?, external_url = ?, last_synced_at = ?, sync_status = 'synced' WHERE id = ?`
    ).run(result.key, result.url, now, entityId);

    return {
      jiraKey: result.key,
      jiraUrl: result.url,
      action: "created",
    };
  }

  return { jiraKey: "", jiraUrl: "", action: "none" };
}

export async function syncFromConfluence(
  spaceKey?: string,
  cql?: string,
  maxResults: number = 25
): Promise<{ imported: number; updated: number; errors: string[] }> {
  const db = getDb();
  const space = spaceKey || config.confluenceSpaceKey;
  const query = cql || `space=${space} ORDER BY lastModified DESC`;

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    const pages = await searchConfluencePages(query, maxResults);

    const upsertStmt = db.prepare(`
      INSERT INTO trace_entities (id, type, external_system, external_id, external_url, title, description, status, metadata_json, created_at, updated_at, last_synced_at, sync_status)
      VALUES (@id, @type, @external_system, @external_id, @external_url, @title, @description, @status, @metadata_json, @created_at, @updated_at, @last_synced_at, @sync_status)
      ON CONFLICT(external_system, external_id) WHERE external_system IS NOT NULL AND external_id IS NOT NULL
      DO UPDATE SET title = @title, status = @status, metadata_json = @metadata_json, updated_at = @updated_at, last_synced_at = @last_synced_at, sync_status = @sync_status
    `);

    const tx = db.transaction(() => {
      for (const page of pages) {
        const now = new Date().toISOString();
        const metadata = JSON.stringify({
          space: page.space,
          version: page.version,
          lastModified: page.lastModified,
        });

        const existing = db
          .prepare("SELECT id FROM trace_entities WHERE external_system = ? AND external_id = ?")
          .get("confluence", page.id) as { id: string } | undefined;

        const entityId = existing?.id || uuid();

        upsertStmt.run({
          id: entityId,
          type: "research",
          external_system: "confluence",
          external_id: page.id,
          external_url: page.url,
          title: page.title,
          description: page.content?.slice(0, 500) || null,
          status: "published",
          metadata_json: metadata,
          created_at: now,
          updated_at: now,
          last_synced_at: now,
          sync_status: "synced",
        });

        if (existing) updated++;
        else imported++;
      }
    });

    tx();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
  }

  return { imported, updated, errors };
}

export async function syncAll(options: {
  jira?: boolean;
  confluence?: boolean;
}): Promise<{
  jira: { imported: number; updated: number; errors: string[] };
  confluence: { imported: number; updated: number; errors: string[] };
}> {
  const db = getDb();
  const startedAt = new Date().toISOString();
  const syncId = uuid();

  const jiraResult = options.jira !== false ? await syncFromJira() : { imported: 0, updated: 0, errors: [] };
  const confluenceResult = options.confluence !== false ? await syncFromConfluence() : { imported: 0, updated: 0, errors: [] };

  const finishedAt = new Date().toISOString();
  const hasErrors = jiraResult.errors.length > 0 || confluenceResult.errors.length > 0;

  db.prepare(
    `INSERT INTO sync_log (id, sync_type, status, message, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    syncId,
    "full",
    hasErrors ? "partial" : "success",
    hasErrors
      ? JSON.stringify({ jiraErrors: jiraResult.errors, confluenceErrors: confluenceResult.errors })
      : "OK",
    startedAt,
    finishedAt
  );

  return { jira: jiraResult, confluence: confluenceResult };
}
