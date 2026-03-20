// ─────────────────────────────────────────────────────────────────────────────
// flow/index.ts
// Entry point for PatchPilot.
// In production: GitLab triggers this via a pipeline webhook event.
// Locally: you can call it with a mock SAST report JSON file.
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { readFileSync } from "fs";
import { runPatchPilot } from "./orchestrator";
import { GitLabSastReport } from "../lib/types";
import { logger } from "../lib/logger";

const log = logger("Main");

async function main() {
  log.info("PatchPilot starting up...");

  let report: GitLabSastReport;

  // ── How to get the SAST report ───────────────────────────────────────────
  // Option A (local dev): pass a file path as first CLI argument
  //   ts-node flow/index.ts ./scripts/mock-sast-report.json
  //
  // Option B (GitLab CI): the report is in the pipeline artifacts,
  //   fetched automatically by the GitLab Duo Agent Platform trigger.
  //   The platform injects it as SAST_REPORT_JSON env var (base64).
  //
  // Option C: SAST_REPORT_JSON env var set directly
  // ────────────────────────────────────────────────────────────────────────

  const filePath = process.argv[2];
  const envReport = process.env.SAST_REPORT_JSON;

  if (filePath) {
    log.info(`Loading SAST report from file: ${filePath}`);
    const raw = readFileSync(filePath, "utf-8");
    report = JSON.parse(raw) as GitLabSastReport;

  } else if (envReport) {
    log.info("Loading SAST report from SAST_REPORT_JSON env var");
    // Could be base64 encoded when coming from GitLab CI
    try {
      report = JSON.parse(Buffer.from(envReport, "base64").toString("utf-8")) as GitLabSastReport;
    } catch {
      report = JSON.parse(envReport) as GitLabSastReport;
    }

  } else {
    log.error("No SAST report provided. Pass a file path or set SAST_REPORT_JSON env var.");
    log.error("Example: ts-node flow/index.ts ./scripts/mock-sast-report.json");
    process.exit(1);
  }

  const result = await runPatchPilot(report);

  // Exit with non-zero code if any fixes failed (useful for CI)
  if (result.failed > 0) {
    log.warn(`${result.failed} finding(s) could not be fixed.`);
    process.exit(1);
  }

  log.success(`All done. ${result.fixed} fix(es) opened as Merge Requests.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
