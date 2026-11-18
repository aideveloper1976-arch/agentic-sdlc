import fs from "fs";
import { config } from "./config.js";
import { validateCwd } from "./sandbox.js";

export interface LogResult {
  filePath: string;
  content: string;
  truncated: boolean;
  totalLines: number;
  returnedLines: number;
}

export function readLocalLogs(filePath: string, tail?: number): LogResult {
  const cwdCheck = validateCwd(filePath);
  if (!cwdCheck.allowed) {
    return {
      filePath,
      content: "",
      truncated: false,
      totalLines: 0,
      returnedLines: 0,
    };
  }

  if (!fs.existsSync(filePath)) {
    return {
      filePath,
      content: `File not found: ${filePath}`,
      truncated: false,
      totalLines: 0,
      returnedLines: 0,
    };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const totalLines = lines.length;

  let result: string;
  let returnedLines: number;

  if (tail && tail > 0 && tail < totalLines) {
    result = lines.slice(-tail).join("\n");
    returnedLines = tail;
  } else {
    result = content;
    returnedLines = totalLines;
  }

  const truncated = result.length > config.maxOutputChars;
  if (truncated) {
    result = result.slice(0, config.maxOutputChars) + `\n\n... [truncated at ${config.maxOutputChars} characters]`;
  }

  return { filePath, content: result, truncated, totalLines, returnedLines };
}
