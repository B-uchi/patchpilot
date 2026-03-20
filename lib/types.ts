// ─────────────────────────────────────────────────────────────────────────────
// lib/types.ts
// Shared TypeScript types used across all three agents.
// Think of this like your shared interfaces file in a Next.js project.
// ─────────────────────────────────────────────────────────────────────────────

/** Severity levels GitLab SAST reports use */
export type Severity = "critical" | "high" | "medium" | "low" | "info" | "unknown";

/** A single vulnerability finding straight from the GitLab SAST JSON report */
export interface RawFinding {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  location: {
    file: string;
    start_line: number;
    end_line?: number;
  };
  identifiers: Array<{
    type: string;   // e.g. "cve", "cwe", "owasp"
    name: string;   // e.g. "CVE-2021-44228"
    value: string;
    url?: string;
  }>;
  solution?: string;
  links?: Array<{ url: string }>;
}

/** A finding after Scout has triaged it — enriched with our classification */
export interface TriagedFinding extends RawFinding {
  isFalsePositive: boolean;
  confidence: "high" | "medium" | "low";
  actionable: boolean;
  owaspCategory?: string;
  cweId?: string;
}

/** Everything Fixer needs to produce a fix */
export interface FixRequest {
  finding: TriagedFinding;
  /** Raw source code of the affected file */
  fileContent: string;
  /** The git ref (branch/commit) we're fixing against */
  targetRef: string;
}

/** What Claude returns after generating a fix */
export interface GeneratedFix {
  finding: TriagedFinding;
  /** The patched file content (full file, ready to commit) */
  patchedContent: string;
  /** Plain-English explanation of what was wrong and how the fix works */
  explanation: string;
  /** The branch PatchPilot created */
  branchName: string;
  /** The GitLab MR iid (internal ID) that was opened */
  mergeRequestIid?: number;
  /** The MR web URL for humans to click */
  mergeRequestUrl?: string;
}

/** What Scribe produces per fix */
export interface ComplianceNote {
  finding: TriagedFinding;
  fix: GeneratedFix;
  /** e.g. ["OWASP A03:2021 - Injection", "CWE-89"] */
  frameworks: string[];
  /** The full markdown audit trail comment posted on the MR */
  auditMarkdown: string;
  timestamp: string;
}

/** The final result of one full PatchPilot run */
export interface PatchPilotResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalFindings: number;
  dismissed: number;
  fixed: number;
  failed: number;
  fixes: GeneratedFix[];
  complianceNotes: ComplianceNote[];
}

/** The raw GitLab SAST artifact shape (top level) */
export interface GitLabSastReport {
  version: string;
  vulnerabilities: RawFinding[];
  remediations?: unknown[];
  scan?: {
    scanner: { name: string; version: string };
    type: string;
    start_time: string;
    end_time: string;
    status: "success" | "failure";
  };
}
