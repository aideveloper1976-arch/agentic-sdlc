import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

export const config = {
  allowedDir: process.env.CODE_EXECUTION_ALLOWED_DIR
    ? path.resolve(process.env.CODE_EXECUTION_ALLOWED_DIR)
    : path.resolve(projectRoot, "..", ".."),
  defaultTimeoutMs: parseInt(process.env.CODE_EXECUTION_TIMEOUT_MS || "60000", 10),
  maxOutputChars: parseInt(process.env.CODE_EXECUTION_MAX_OUTPUT_CHARS || "10000", 10),
  dockerEnabled: process.env.CODE_EXECUTION_DOCKER_ENABLED !== "false",
};
