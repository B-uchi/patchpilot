// ─────────────────────────────────────────────────────────────────────────────
// agents/fixer/index.ts
// Fixer Agent — entry point.
// For each actionable finding from Scout:
//   1. Fetches the vulnerable file from GitLab
//   2. Sends it to Claude for a fix
//   3. Commits the fix and opens a Merge Request
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { GitLabClient } from "../../lib/gitlab-api";
import { GeneratedFix, TriagedFinding } from "../../lib/types";
import { generateFix } from "./claude-client";
import { createFixMR } from "./gitlab-mr";
import { logger } from "../../lib/logger";
import { sleep } from "../../lib/utils";

const log = logger("Fixer");

interface FixerConfig {
  branchPrefix: string;
  dryRun: boolean;
}

export async function runFixer(
  findings: TriagedFinding[],
  gitlab: GitLabClient,
  anthropic: Anthropic,
  config: FixerConfig
): Promise<{ fixes: GeneratedFix[]; failed: TriagedFinding[] }> {
  const actionable = findings.filter((f) => f.actionable);
  log.info(`Fixer received ${actionable.length} findings to fix`);

  const fixes: GeneratedFix[] = [];
  const failed: TriagedFinding[] = [];

  // Get the default branch once (e.g. "main" or "master")
  const defaultBranch = await gitlab.getDefaultBranch();
  log.info(`Target branch: ${defaultBranch}`);

  for (const finding of actionable) {
    log.info(`Processing: [${finding.severity}] ${finding.name} @ ${finding.location.file}`);

    try {
      // Step 1: Fetch the current file content from GitLab
      const fileContent = await gitlab.getFileContent(
        finding.location.file,
        defaultBranch
      );

      // Step 2: Ask Claude to generate the fix
      const claudeFix = await generateFix(anthropic, {
        finding,
        fileContent,
        targetRef: defaultBranch,
      });

      // Step 3: Commit the fix and open a Merge Request
      const generatedFix = await createFixMR(
        gitlab,
        { finding, fileContent, targetRef: defaultBranch },
        claudeFix,
        config.branchPrefix,
        defaultBranch,
        config.dryRun
      );

      fixes.push(generatedFix);
      log.success(`Fixed: ${finding.name} → ${generatedFix.mergeRequestUrl ?? "(dry run)"}`);

      // Brief pause between findings to be polite to the APIs
      await sleep(1000);

    } catch (err) {
      log.error(`Failed to fix: ${finding.name}`, err);
      failed.push(finding);
    }
  }

  log.success(`Fixer done — ${fixes.length} fixed, ${failed.length} failed`);
  return { fixes, failed };
}
