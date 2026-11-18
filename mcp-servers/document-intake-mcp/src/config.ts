import * as dotenv from 'dotenv';
import { z } from 'zod';
import * as path from 'path';

dotenv.config();

export const SECTION_NAME = "document_intake";

export interface EnvConfig {
  DOCUMENT_INTAKE_ROOT: string;
  DOCUMENT_EVIDENCE_DIR: string;
  DOCUMENT_REQUIREMENTS_DIR: string;
  DOCUMENT_RESEARCH_DIR: string;
  MAX_DOCUMENT_SIZE_MB: number;
  MAX_EXTRACTED_CHARS: number;
}

const envSchema = z.object({
  DOCUMENT_INTAKE_ROOT: z.string().optional(),
  DOCUMENT_EVIDENCE_DIR: z.string().optional(),
  DOCUMENT_REQUIREMENTS_DIR: z.string().optional(),
  DOCUMENT_RESEARCH_DIR: z.string().optional(),
  MAX_DOCUMENT_SIZE_MB: z.coerce.number().optional(),
  MAX_EXTRACTED_CHARS: z.coerce.number().optional(),
});

function resolvePath(base: string, relative: string): string {
  if (path.isAbsolute(relative)) return relative;
  return path.resolve(base, relative);
}

const root = process.env.DOCUMENT_INTAKE_ROOT || process.cwd();

export const config: EnvConfig = {
  DOCUMENT_INTAKE_ROOT: root,
  DOCUMENT_EVIDENCE_DIR: resolvePath(root, process.env.DOCUMENT_EVIDENCE_DIR || "docs/product/evidence/documents"),
  DOCUMENT_REQUIREMENTS_DIR: resolvePath(root, process.env.DOCUMENT_REQUIREMENTS_DIR || "docs/product/requirements"),
  DOCUMENT_RESEARCH_DIR: resolvePath(root, process.env.DOCUMENT_RESEARCH_DIR || "docs/product/research"),
  MAX_DOCUMENT_SIZE_MB: parseInt(process.env.MAX_DOCUMENT_SIZE_MB || "50", 10),
  MAX_EXTRACTED_CHARS: parseInt(process.env.MAX_EXTRACTED_CHARS || "200000", 10),
};

export const validateConfig = (settings: Partial<EnvConfig>): z.infer<typeof envSchema> => {
  return envSchema.parse(settings);
};
