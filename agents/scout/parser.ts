// ─────────────────────────────────────────────────────────────────────────────
// agents/scout/parser.ts
// Converts the raw GitLab SAST JSON artifact into our RawFinding[] type.
// The SAST report is just JSON — parsing it is like reading an API response.
// ─────────────────────────────────────────────────────────────────────────────

import { GitLabSastReport, RawFinding } from "../../lib/types";
import { logger } from "../../lib/logger";

const log = logger("Scout:Parser");

export function parseSastReport(report: GitLabSastReport): RawFinding[] {
  if (!report.vulnerabilities || !Array.isArray(report.vulnerabilities)) {
    log.warn("SAST report has no vulnerabilities array — returning empty list");
    return [];
  }

  log.info(`Parsing ${report.vulnerabilities.length} raw findings`);

  // Normalise each finding so we always have consistent shape
  return report.vulnerabilities.map((v): RawFinding => ({
    id:          v.id ?? crypto.randomUUID(),
    name:        v.name ?? "Unknown vulnerability",
    description: v.description ?? "",
    severity:    v.severity ?? "unknown",
    location: {
      file:       v.location?.file ?? "unknown",
      start_line: v.location?.start_line ?? 0,
      end_line:   v.location?.end_line,
    },
    identifiers: Array.isArray(v.identifiers) ? v.identifiers : [],
    solution:    v.solution,
    links:       Array.isArray(v.links) ? v.links : [],
  }));
}
