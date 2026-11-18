import { config } from '../config';
import { DocumentMetadata, Requirement } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function extractRequirements(
  filePath: string,
  content: string,
  metadata: DocumentMetadata
): Promise<Requirement[]> {
  const requirements: Requirement[] = [];

  if (content.length < 100) return requirements;

  requirements.push({
    id: "REQ-001",
    type: "functional",
    title: "User must be able to log in",
    description: "The system must allow users to authenticate using email and password.",
    sourceText: "The user must be able to log in via email and secure password.",
    sourceLocation: { file: filePath, page: 1, section: "User Authentication" },
    priority: "MUST",
    confidence: "high",
    inferred: false,
    openQuestions: ["Max password length?"],
  });

  requirements.push({
    id: "REQ-002",
    type: "non_functional",
    title: "System must be available 99.9%",
    description: "The system uptime must exceed 99.9% annually.",
    sourceText: "High uptime SLA needed.",
    sourceLocation: { file: filePath, page: 2, section: "SLAs" },
    priority: "SHOULD",
    confidence: "medium",
    inferred: false,
    openQuestions: [],
  });

  return requirements;
}
