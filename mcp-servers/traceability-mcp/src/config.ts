import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

export const config = {
  dbPath: process.env.TRACEABILITY_DB_PATH
    ? path.resolve(process.env.TRACEABILITY_DB_PATH)
    : path.resolve(projectRoot, ".traceability", "traceability.db"),
  reportDir: process.env.TRACEABILITY_REPORT_DIR
    ? path.resolve(process.env.TRACEABILITY_REPORT_DIR)
    : path.resolve(projectRoot, "..", "..", "docs", "product", "traceability", "reports"),

  atlassianSiteUrl: process.env.ATLASSIAN_SITE_URL || "",
  atlassianEmail: process.env.ATLASSIAN_EMAIL || "",
  atlassianApiToken: process.env.ATLASSIAN_API_TOKEN || "",

  jiraBaseUrl: process.env.JIRA_BASE_URL || process.env.ATLASSIAN_SITE_URL || "",
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || "",
  jiraEnabled: process.env.JIRA_ENABLED !== "false",

  confluenceBaseUrl: process.env.CONFLUENCE_BASE_URL || "",
  confluenceSpaceKey: process.env.CONFLUENCE_SPACE_KEY || "",
  confluenceEnabled: process.env.CONFLUENCE_ENABLED !== "false",

  syncMode: (process.env.SYNC_MODE || "manual") as "manual" | "auto",
  syncIntervalSeconds: parseInt(process.env.SYNC_INTERVAL_SECONDS || "300", 10),
};

export function getBasicAuthHeader(): string {
  const encoded = Buffer.from(
    `${config.atlassianEmail}:${config.atlassianApiToken}`
  ).toString("base64");
  return `Basic ${encoded}`;
}
