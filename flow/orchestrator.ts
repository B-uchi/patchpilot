// ─────────────────────────────────────────────────────────────────────────────
// flow/orchestrator.ts
// The conductor. Runs Scout → Fixer → Scribe in sequence.
// This is what GitLab calls a "Flow" — a pipeline of agents.
// Think of it like your main() function that calls middleware in order.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { GitLabClient } from "../lib/gitlab-api";
import { GitLabSastReport, PatchPilotResult } from "../lib/types";
import { runScout } from "../agents/scout";
import { runFixer } from "../agents/fixer";
import { runScribe } from "../agents/scribe";
import { buildRunSummary } from "../agents/scribe/dashboard";
import { logger } from "../lib/logger";
import { generateRunId, now } from "../lib/utils";
import { config } from "../config";

const log = logger("Orchestrator");

export async function runPatchPilot(
  sastReport: GitLabSastReport
): Promise<PatchPilotResult> {
  const runId = generateRunId();
  const startedAt = now();

  log.info(`━━━ PatchPilot Run ${runId} starting ━━━`);

  // ── Initialise clients ────────────────────────────────────────────────────
  const gitlab = new GitLabClient(
    config.gitlab.baseUrl,
    config.gitlab.token,
    config.gitlab.projectId
  );

  const anthropic = new Anthropic({
    apiKey: config.anthropic.apiKey,
  });

  // ── Agent 1: Scout ────────────────────────────────────────────────────────
  log.info("▶ Running Scout agent...");
  const triagedFindings = await runScout(sastReport, config.patchPilot.minSeverity);

  const actionable  = triagedFindings.filter((f) => f.actionable);
  const dismissed   = triagedFindings.filter((f) => !f.actionable);

  log.info(`Scout: ${actionable.length} actionable, ${dismissed.length} dismissed`);

  if (actionable.length === 0) {
    log.info("No actionable findings — nothing to fix. Exiting.");
    return {
      runId,
      startedAt,
      completedAt: now(),
      totalFindings: triagedFindings.length,
      dismissed: dismissed.length,
      fixed: 0,
      failed: 0,
      fixes: [],
      complianceNotes: [],
    };
  }

  // ── Agent 2: Fixer ────────────────────────────────────────────────────────
  log.info("▶ Running Fixer agent...");
  const { fixes, failed } = await runFixer(
    triagedFindings,
    gitlab,
    anthropic,
    {
      branchPrefix: config.patchPilot.branchPrefix,
      dryRun: config.patchPilot.dryRun,
    }
  );

  // ── Agent 3: Scribe ───────────────────────────────────────────────────────
  log.info("▶ Running Scribe agent...");
  const complianceNotes = await runScribe(fixes, gitlab, config.patchPilot.dryRun);

  // ── Assemble result ───────────────────────────────────────────────────────
  const result: PatchPilotResult = {
    runId,
    startedAt,
    completedAt: now(),
    totalFindings: triagedFindings.length,
    dismissed: dismissed.length,
    fixed: fixes.length,
    failed: failed.length,
    fixes,
    complianceNotes,
  };

  const summary = buildRunSummary(result);
  log.success(`\n${summary}`);
  log.info(`━━━ PatchPilot Run ${runId} complete ━━━`);

  return result;
}
