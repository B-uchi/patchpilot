// ─────────────────────────────────────────────────────────────────────────────
// scripts/test-locally.ts
// Runs a full PatchPilot flow locally in dry-run mode.
// No real branches, commits, or MRs are created.
//
// Usage:
//   1. Copy .env.example → .env and fill in your keys
//   2. npx ts-node scripts/seed-mock-scan.ts     ← generates mock SAST report
//   3. npx ts-node scripts/test-locally.ts       ← runs PatchPilot dry run
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

// ── Remap local .env variable names to what the app expects ─────────────────
// In CI, the trigger does this remapping in the shell script.
// Locally we do it here so .env stays clean and intuitive.
if (process.env.PATCHPILOT_TOKEN && !process.env.GITLAB_TOKEN) {
  process.env.GITLAB_TOKEN = process.env.PATCHPILOT_TOKEN;
}

// Force dry run — local testing never opens real MRs
process.env.DRY_RUN = "true";

import { runPatchPilot } from "../flow/orchestrator";
import { GitLabSastReport } from "../lib/types";
import { logger } from "../lib/logger";

const log = logger("LocalTest");

async function main() {
  // Check the two things a local user actually needs to set
  const missing: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (!process.env.GITLAB_TOKEN)      missing.push("PATCHPILOT_TOKEN (or GITLAB_TOKEN)");
  if (!process.env.GITLAB_PROJECT_ID) missing.push("GITLAB_PROJECT_ID");

  if (missing.length > 0) {
    console.error("\n✗ Missing required variables in your .env file:");
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error("\nCopy .env.example → .env and fill them in.\n");
    process.exit(1);
  }

  const mockReportPath = path.resolve(__dirname, "mock-sast-report.json");

  if (!fs.existsSync(mockReportPath)) {
    console.error(
      "✗ Mock SAST report not found.\n" +
      "  Run this first: npx ts-node scripts/seed-mock-scan.ts"
    );
    process.exit(1);
  }

  log.info("Loading mock SAST report...");
  const report: GitLabSastReport = JSON.parse(
    fs.readFileSync(mockReportPath, "utf-8")
  );

  log.info("Starting PatchPilot dry run (no real MRs will be created)...\n");

  const result = await runPatchPilot(report);

  console.log("\n" + "═".repeat(50));
  console.log("RUN COMPLETE");
  console.log("═".repeat(50));
  console.log(`Total findings : ${result.totalFindings}`);
  console.log(`Dismissed      : ${result.dismissed}`);
  console.log(`Fixed          : ${result.fixed}`);
  console.log(`Failed         : ${result.failed}`);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
