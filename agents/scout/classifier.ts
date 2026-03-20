// ─────────────────────────────────────────────────────────────────────────────
// agents/scout/classifier.ts
// Takes raw findings and decides: real or noise? Worth fixing?
// This is the "brain" of Scout — no AI needed here, just logic.
// ─────────────────────────────────────────────────────────────────────────────

import { RawFinding, Severity, TriagedFinding } from "../../lib/types";
import { meetsMinSeverity } from "../../lib/utils";
import { logger } from "../../lib/logger";

const log = logger("Scout:Classifier");

// Patterns that are commonly false positives in SAST scanners.
// You can extend this list as you learn your specific codebase.
const FALSE_POSITIVE_PATTERNS: RegExp[] = [
  /test[s]?\//i,          // findings inside test files
  /\.spec\./i,            // spec files
  /\.test\./i,            // test files
  /mock/i,                // mock files
  /fixture/i,             // fixture files
];

// Identifiers that tell us an OWASP category (for the compliance agent later)
const OWASP_MAP: Record<string, string> = {
  "A01": "A01:2021 - Broken Access Control",
  "A02": "A02:2021 - Cryptographic Failures",
  "A03": "A03:2021 - Injection",
  "A04": "A04:2021 - Insecure Design",
  "A05": "A05:2021 - Security Misconfiguration",
  "A06": "A06:2021 - Vulnerable and Outdated Components",
  "A07": "A07:2021 - Identification and Authentication Failures",
  "A08": "A08:2021 - Software and Data Integrity Failures",
  "A09": "A09:2021 - Security Logging and Monitoring Failures",
  "A10": "A10:2021 - Server-Side Request Forgery",
};

function isFalsePositive(finding: RawFinding): boolean {
  return FALSE_POSITIVE_PATTERNS.some((pattern) =>
    pattern.test(finding.location.file)
  );
}

function extractOwaspCategory(finding: RawFinding): string | undefined {
  for (const id of finding.identifiers) {
    if (id.type === "owasp") {
      const match = id.value.match(/A(\d{2})/);
      if (match) {
        const key = `A${match[1]}`;
        return OWASP_MAP[key] ?? id.name;
      }
    }
  }
  return undefined;
}

function extractCweId(finding: RawFinding): string | undefined {
  const cweId = finding.identifiers.find((id) => id.type === "cwe");
  return cweId ? `CWE-${cweId.value}` : undefined;
}

function scoreConfidence(finding: RawFinding): "high" | "medium" | "low" {
  // More identifiers = more confident this is real
  if (finding.identifiers.length >= 3) return "high";
  if (finding.identifiers.length >= 1) return "medium";
  return "low";
}

export function classifyFindings(
  findings: RawFinding[],
  minSeverity: Severity
): TriagedFinding[] {
  log.info(`Classifying ${findings.length} findings (min severity: ${minSeverity})`);

  const triaged: TriagedFinding[] = findings.map((f): TriagedFinding => {
    const falsePositive = isFalsePositive(f);
    const meetsThreshold = meetsMinSeverity(f.severity, minSeverity);

    return {
      ...f,
      isFalsePositive: falsePositive,
      confidence:      scoreConfidence(f),
      actionable:      !falsePositive && meetsThreshold,
      owaspCategory:   extractOwaspCategory(f),
      cweId:           extractCweId(f),
    };
  });

  const actionable = triaged.filter((f) => f.actionable).length;
  const dismissed  = triaged.filter((f) => !f.actionable).length;

  log.success(`Triage complete — ${actionable} actionable, ${dismissed} dismissed`);

  return triaged;
}
