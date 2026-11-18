export function formatCommitMessage(message: string, storyId?: string): string {
  if (storyId) {
    const prefix = `[Story: ${storyId}]`;
    if (message.startsWith(prefix)) {
      return message;
    }
    return `${prefix} ${message}`;
  }
  return message;
}

export function extractStoryId(message: string): string | null {
  const match = message.match(/\[Story:\s*([^\]]+)\]/);
  return match ? match[1].trim() : null;
}

export function validateCommitMessage(message: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (message.length > 72 && !message.includes(" ")) {
    warnings.push("Commit message may be too long without spaces");
  }

  if (message.length < 10) {
    warnings.push("Commit message is very short, consider adding more detail");
  }

  const hasStoryId = message.includes("Story:");
  if (!hasStoryId) {
    warnings.push("Commit message does not include a Story ID reference");
  }

  return { valid: warnings.length === 0, warnings };
}
