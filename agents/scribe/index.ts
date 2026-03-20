// ─────────────────────────────────────────────────────────────────────────────
// agents/scribe/index.ts
// Scribe Agent — entry point.
// For each fix that Fixer produced:
//   1. Maps the vulnerability to compliance frameworks (OWASP, CWE, SOC2)
//   2. Builds a detailed audit trail comment
//   3. Posts it on the GitLab Merge Request
// ─────────────────────────────────────────────────────────────────────────────

import { GitLabClient } from "../../lib/gitlab-api";
import { ComplianceNote, GeneratedFix } from "../../lib/types";
import { mapCompliance } from "./compliance-mapper";
import { buildAuditComment } from "./dashboard";
import { logger } from "../../lib/logger";
import { now, sleep } from "../../lib/utils";

const log = logger("Scribe");

export async function runScribe(
  fixes: GeneratedFix[],
  gitlab: GitLabClient,
  dryRun: boolean
): Promise<ComplianceNote[]> {
  log.info(`Scribe processing ${fixes.length} fixes`);

  const notes: ComplianceNote[] = [];

  for (const fix of fixes) {
    log.info(`Writing compliance note for: ${fix.finding.name}`);

    // Map to compliance frameworks
    const mapping = mapCompliance(fix.finding);

    // Build the audit markdown
    const auditMarkdown = buildAuditComment(fix, mapping);

    if (!dryRun && fix.mergeRequestIid) {
      try {
        // Post as a comment on the Merge Request
        await gitlab.commentOnMR(fix.mergeRequestIid, auditMarkdown);
        log.success(`Compliance note posted on MR !${fix.mergeRequestIid}`);
      } catch (err) {
        log.error(`Failed to post compliance note on MR !${fix.mergeRequestIid}`, err);
      }
    } else {
      log.warn(`DRY RUN — would post compliance note on MR !${fix.mergeRequestIid ?? "N/A"}`);
    }

    notes.push({
      finding:       fix.finding,
      fix,
      frameworks:    mapping.frameworks,
      auditMarkdown,
      timestamp:     now(),
    });

    await sleep(500);
  }

  log.success(`Scribe done — ${notes.length} compliance notes written`);
  return notes;
}
