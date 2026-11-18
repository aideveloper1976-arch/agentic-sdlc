import type { TraceResult, Gap, TraceReport } from "./types.js";
import { getEvidence } from "./traceability.js";

const LINK_TYPE_LABELS: Record<string, string> = {
  derived_from: "Derived From",
  decomposes_to: "Decomposes To",
  implemented_by: "Implemented By",
  validated_by: "Validated By",
  reviewed_by: "Reviewed By",
  secured_by: "Secured By",
  released_in: "Released In",
  depends_on: "Depends On",
  mitigates: "Mitigates",
  documents: "Documents",
  relates_to: "Relates To",
};

function formatLinkType(t: string): string {
  return LINK_TYPE_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function entityTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    idea: "💡",
    research: "🔬",
    epic: "🏗️",
    feature: "✨",
    story: "📋",
    code_change: "💻",
    test_result: "✅",
    ux_review: "🎨",
    security_review: "🔒",
    release: "🚀",
    decision: "📝",
    risk: "⚠️",
    dependency: "🔗",
  };
  return icons[type] || "📄";
}

export function generateMarkdownReport(trace: TraceResult): string {
  const lines: string[] = [];

  lines.push(`# Traceability Report: ${trace.entity.title}`);
  lines.push("");
  lines.push(`_Generated at ${new Date().toISOString()}_`);
  lines.push("");

  // Entity section
  lines.push("## Entity");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **ID** | \`${trace.entity.id}\` |`);
  lines.push(`| **Type** | ${entityTypeIcon(trace.entity.type)} ${trace.entity.type} |`);
  lines.push(`| **Title** | ${trace.entity.title} |`);
  lines.push(`| **Status** | ${trace.entity.status || "—"} |`);
  lines.push(`| **External System** | ${trace.entity.external_system || "—"} |`);
  if (trace.entity.external_url) {
    lines.push(`| **External Link** | [${trace.entity.external_id || trace.entity.external_url}](${trace.entity.external_url}) |`);
  }
  lines.push(`| **Sync Status** | ${trace.entity.sync_status} |`);
  if (trace.entity.description) {
    lines.push("");
    lines.push("### Description");
    lines.push("");
    lines.push(trace.entity.description);
  }
  lines.push("");

  // Upstream trace
  lines.push("## Upstream Trace");
  lines.push("");
  if (trace.upstream.length === 0) {
    lines.push("_No upstream links found._");
  } else {
    lines.push("| Entity | Type | Link Type | Status | External |");
    lines.push("|--------|------|-----------|--------|----------|");
    for (const item of trace.upstream) {
      const ext = item.entity.external_id
        ? `[${item.entity.external_id}](${item.entity.external_url})`
        : "—";
      lines.push(
        `| ${entityTypeIcon(item.entity.type)} **${item.entity.title}** | \`${item.entity.type}\` | ${formatLinkType(item.link.link_type)} | ${item.entity.status || "—"} | ${ext} |`
      );
    }
  }
  lines.push("");

  // Downstream trace
  lines.push("## Downstream Trace");
  lines.push("");
  if (trace.downstream.length === 0) {
    lines.push("_No downstream links found._");
  } else {
    lines.push("| Entity | Type | Link Type | Status | External |");
    lines.push("|--------|------|-----------|--------|----------|");
    for (const item of trace.downstream) {
      const ext = item.entity.external_id
        ? `[${item.entity.external_id}](${item.entity.external_url})`
        : "—";
      lines.push(
        `| ${entityTypeIcon(item.entity.type)} **${item.entity.title}** | \`${item.entity.type}\` | ${formatLinkType(item.link.link_type)} | ${item.entity.status || "—"} | ${ext} |`
      );
    }
  }
  lines.push("");

  // Evidence
  lines.push("## Evidence");
  lines.push("");
  if (trace.evidence.length === 0) {
    lines.push("_No evidence recorded._");
  } else {
    for (const ev of trace.evidence) {
      lines.push(`### ${ev.title}`);
      lines.push("");
      lines.push(`| Field | Value |`);
      lines.push(`|-------|-------|`);
      lines.push(`| **Type** | ${ev.evidence_type} |`);
      if (ev.source_url) lines.push(`| **Source** | [Link](${ev.source_url}) |`);
      if (ev.file_path) lines.push(`| **File** | \`${ev.file_path}\` |`);
      if (ev.summary) {
        lines.push(`| **Summary** | ${ev.summary} |`);
      }
      lines.push("");
    }
  }
  lines.push("");

  // Gaps
  lines.push("## Gaps");
  lines.push("");
  if (trace.gaps.length === 0) {
    lines.push("_No gaps detected. Traceability is complete._ ✅");
  } else {
    lines.push("| Severity | Gap |");
    lines.push("|----------|-----|");
    for (const gap of trace.gaps) {
      const severityIcon = gap.severity === "high" ? "🔴" : gap.severity === "medium" ? "🟡" : "🟢";
      lines.push(`| ${severityIcon} **${gap.severity.toUpperCase()}** | ${gap.message} |`);
    }
  }
  lines.push("");

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");
  const recommendations = generateRecommendations(trace.gaps);
  if (recommendations.length === 0) {
    lines.push("_No recommendations._");
  } else {
    for (const rec of recommendations) {
      lines.push(`- ${rec}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

export function generateRecommendations(gaps: Gap[]): string[] {
  const recs: string[] = [];

  for (const gap of gaps) {
    switch (gap.type) {
      case "missing_upstream_feature":
        recs.push(`Create or link a **Feature** that this Story decomposes from.`);
        break;
      case "missing_upstream_epic":
        recs.push(`Link this Feature to an **EPIC** using \`link_entities\` with type \`decomposes_to\`.`);
        break;
      case "missing_research_link":
        recs.push(`Link this EPIC to a **Research** entity to establish the evidence base.`);
        break;
      case "missing_test_evidence":
        recs.push(`Add **test results** via \`add_evidence\` with type \`test_result\` or link a test entity downstream.`);
        break;
      case "missing_ux_review":
        recs.push(`Schedule a **UX Review** and link it downstream via \`link_entities\` with type \`reviewed_by\`.`);
        break;
      case "missing_security_review":
        recs.push(`Schedule a **Security Review** before release. Link it via \`link_entities\` with type \`secured_by\`.`);
        break;
      case "release_missing_tests":
        recs.push(`Link **test results** to this release to demonstrate quality validation.`);
        break;
      case "release_missing_security":
        recs.push(`Link **security review** evidence to this release before shipping.`);
        break;
    }
  }

  return recs;
}

export function generateHtmlContent(trace: TraceResult): string {
  const md = generateMarkdownReport(trace);
  const html = mdToBasicHtml(md);
  return html;
}

function mdToBasicHtml(md: string): string {
  let html = md
    .replace(/^###### (.*$)/gm, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gm, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gm, "<h4>$1</h4>")
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\|(.+)\|/g, (match) => {
      if (match.includes("---")) return "";
      const cells = match.split("|").filter(Boolean);
      return "<tr><td>" + cells.join("</td><td>") + "</td></tr>";
    });

  html = "<p>" + html + "</p>";
  html = html.replace(/<tr>/g, "<table><tr>").replace(/<\/tr>(?!.*<tr>)/g, "</tr></table>");

  return html;
}
