import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "./config.js";
import { getSchema } from "./schema.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = path.dirname(config.dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function initDb(): void {
  const database = getDb();
  database.exec(getSchema());
  console.error(`Database initialised at ${config.dbPath}`);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

if (process.argv[1] && (process.argv[1].endsWith("db.js") || process.argv[1].endsWith("db.ts"))) {
  initDb();
  closeDb();
}
