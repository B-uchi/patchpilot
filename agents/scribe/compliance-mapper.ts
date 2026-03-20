// ─────────────────────────────────────────────────────────────────────────────
// agents/scribe/compliance-mapper.ts
// Maps a finding to the relevant security compliance frameworks.
// No AI needed — just lookup tables + logic.
// ─────────────────────────────────────────────────────────────────────────────

import { TriagedFinding } from "../../lib/types";

export interface ComplianceMapping {
  frameworks: string[];
  references: string[];
}

// CWE → OWASP Top 10 2021 mapping (most common ones)
const CWE_TO_OWASP: Record<string, string> = {
  "CWE-79":  "A03:2021 - Injection (XSS)",
  "CWE-89":  "A03:2021 - Injection (SQL)",
  "CWE-22":  "A01:2021 - Broken Access Control (Path Traversal)",
  "CWE-352": "A01:2021 - Broken Access Control (CSRF)",
  "CWE-287": "A07:2021 - Identification and Authentication Failures",
  "CWE-798": "A07:2021 - Identification and Authentication Failures (Hardcoded Credentials)",
  "CWE-502": "A08:2021 - Software and Data Integrity Failures (Deserialization)",
  "CWE-326": "A02:2021 - Cryptographic Failures (Weak Algorithm)",
  "CWE-327": "A02:2021 - Cryptographic Failures (Broken Algorithm)",
  "CWE-312": "A02:2021 - Cryptographic Failures (Cleartext Storage)",
  "CWE-200": "A01:2021 - Broken Access Control (Info Exposure)",
  "CWE-434": "A04:2021 - Insecure Design (File Upload)",
};

// CWE → SOC 2 control (simplified mapping)
const CWE_TO_SOC2: Record<string, string> = {
  "CWE-89":  "CC6.1 - Logical and Physical Access Controls",
  "CWE-79":  "CC6.1 - Logical and Physical Access Controls",
  "CWE-287": "CC6.1 - Logical and Physical Access Controls",
  "CWE-326": "CC6.7 - Data Transmission Encryption",
  "CWE-312": "CC6.7 - Data Transmission Encryption",
  "CWE-798": "CC6.1 - Logical and Physical Access Controls",
};

export function mapCompliance(finding: TriagedFinding): ComplianceMapping {
  const frameworks: string[] = [];
  const references: string[] = [];

  // Add OWASP from the finding's own identifiers first
  if (finding.owaspCategory) {
    frameworks.push(`OWASP ${finding.owaspCategory}`);
  }

  // Add CWE
  if (finding.cweId) {
    frameworks.push(finding.cweId);

    // Cross-reference to OWASP via CWE if not already present
    const owaspFromCwe = CWE_TO_OWASP[finding.cweId];
    if (owaspFromCwe && !finding.owaspCategory) {
      frameworks.push(`OWASP ${owaspFromCwe}`);
    }

    // Cross-reference to SOC 2
    const soc2 = CWE_TO_SOC2[finding.cweId];
    if (soc2) {
      frameworks.push(`SOC 2 ${soc2}`);
    }
  }

  // Collect any external links from the finding as references
  if (finding.links) {
    references.push(...finding.links.map((l) => l.url));
  }

  // Add NVD reference for CVEs
  const cveId = finding.identifiers.find((id) => id.type === "cve");
  if (cveId) {
    references.push(`https://nvd.nist.gov/vuln/detail/${cveId.value}`);
    frameworks.push(`CVE: ${cveId.value}`);
  }

  return { frameworks, references };
}
