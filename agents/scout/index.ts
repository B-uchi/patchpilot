// ─────────────────────────────────────────────────────────────────────────────
// agents/scout/index.ts
// Scout Agent — entry point.
// Receives a SAST report, returns triaged findings ready for Fixer.
// ─────────────────────────────────────────────────────────────────────────────

import { GitLabSastReport, Severity, TriagedFinding } from "../../lib/types";
import { parseSastReport } from "./parser";
import { classifyFindings } from "./classifier";
import { logger } from "../../lib/logger";
import { SEVERITY_WEIGHT } from "../../lib/utils";

const log = logger("Scout");

export async function runScout(
  report: GitLabSastReport,
  minSeverity: Severity
): Promise<TriagedFinding[]> {
  log.info("Scout is awake — starting triage");

  // Step 1: Parse the raw SAST JSON into our typed findings
  const rawFindings = parseSastReport(report);
  log.info(`Parsed ${rawFindings.length} raw findings from SAST report`);

  // Step 2: Classify — filter noise, assess severity, extract compliance IDs
  const triaged = classifyFindings(rawFindings, minSeverity);

  // Step 3: Sort actionable findings by severity (most critical first)
  const actionable = triaged
    .filter((f) => f.actionable)
    .sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);

  log.success(
    `Scout done — ${actionable.length} findings queued for Fixer`,
    actionable.map((f) => `[${f.severity}] ${f.name} @ ${f.location.file}:${f.location.start_line}`)
  );

  return triaged; // Return all (Orchestrator will filter actionable ones)
}
