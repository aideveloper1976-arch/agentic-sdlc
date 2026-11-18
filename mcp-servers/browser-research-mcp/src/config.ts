import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

export const config = {
  searxngUrl: process.env.SEARXNG_URL || "http://localhost:8080",
  searxngBackupUrl: process.env.SEARXNG_BACKUP_URL || "",
  browserHeadless: process.env.BROWSER_HEADLESS !== "false",
  evidenceDir: process.env.EVIDENCE_DIR
    ? path.resolve(process.env.EVIDENCE_DIR)
    : path.resolve(projectRoot, "..", "docs", "product", "evidence"),
  browserTimeoutMs: parseInt(process.env.BROWSER_TIMEOUT_MS || "30000", 10),
};

export function ensureDirectories(): void {
  const dirs = [
    path.join(config.evidenceDir, "json"),
    path.join(config.evidenceDir, "screenshots"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
