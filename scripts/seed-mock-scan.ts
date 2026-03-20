// ─────────────────────────────────────────────────────────────────────────────
// scripts/seed-mock-scan.ts
// Generates a realistic mock GitLab SAST report JSON file.
// Run this first, then use the output with test-locally.ts
// Usage: ts-node scripts/seed-mock-scan.ts
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from "fs";
import { GitLabSastReport } from "../lib/types";

const mockReport: GitLabSastReport = {
  version: "15.0.4",
  vulnerabilities: [
    {
      id: "vuln-001-sql-injection",
      name: "SQL Injection",
      description:
        "User-controlled input is used directly in a SQL query without sanitisation. " +
        "An attacker can manipulate the query to read, modify, or delete database records.",
      severity: "critical",
      location: {
        file: "src/routes/users.ts",
        start_line: 42,
        end_line: 45,
      },
      identifiers: [
        { type: "cwe",   name: "CWE-89",  value: "89",  url: "https://cwe.mitre.org/data/definitions/89.html" },
        { type: "owasp", name: "A03:2021", value: "A03", url: "https://owasp.org/Top10/A03_2021-Injection/" },
      ],
      solution: "Use parameterised queries or an ORM instead of string concatenation.",
      links: [{ url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html" }],
    },
    {
      id: "vuln-002-xss",
      name: "Cross-Site Scripting (XSS)",
      description:
        "Unsanitised user input is rendered directly into HTML. " +
        "An attacker can inject malicious scripts that run in victims' browsers.",
      severity: "high",
      location: {
        file: "src/views/profile.ts",
        start_line: 88,
        end_line: 90,
      },
      identifiers: [
        { type: "cwe",   name: "CWE-79",  value: "79",  url: "https://cwe.mitre.org/data/definitions/79.html" },
        { type: "owasp", name: "A03:2021", value: "A03", url: "https://owasp.org/Top10/A03_2021-Injection/" },
      ],
      solution: "Encode all user-supplied data before inserting into HTML. Use a templating engine with auto-escaping.",
      links: [],
    },
    {
      id: "vuln-003-hardcoded-secret",
      name: "Hardcoded credentials",
      description:
        "A secret key or password is hardcoded directly in the source code. " +
        "Anyone with read access to the repository can extract the credentials.",
      severity: "high",
      location: {
        file: "src/lib/mailer.ts",
        start_line: 7,
      },
      identifiers: [
        { type: "cwe", name: "CWE-798", value: "798", url: "https://cwe.mitre.org/data/definitions/798.html" },
      ],
      solution: "Store secrets in environment variables and reference them via process.env.",
      links: [],
    },
    {
      // This one is in a test file — Scout should dismiss it as a false positive
      id: "vuln-004-test-noise",
      name: "Weak hashing algorithm",
      description: "MD5 is used for hashing, which is cryptographically broken.",
      severity: "medium",
      location: {
        file: "tests/crypto.test.ts",
        start_line: 12,
      },
      identifiers: [
        { type: "cwe", name: "CWE-327", value: "327" },
      ],
      solution: "Use SHA-256 or bcrypt instead.",
      links: [],
    },
  ],
  scan: {
    scanner:    { name: "Semgrep", version: "1.56.0" },
    type:       "sast",
    start_time: new Date().toISOString(),
    end_time:   new Date().toISOString(),
    status:     "success",
  },
};

mkdirSync("./scripts/output", { recursive: true });
const outPath = "./scripts/output/mock-sast-report.json";
writeFileSync(outPath, JSON.stringify(mockReport, null, 2));

console.log(`✓ Mock SAST report written to: ${outPath}`);
console.log(`  ${mockReport.vulnerabilities.length} findings (1 should be dismissed as test noise)`);
console.log(`\nNext step:`);
console.log(`  ts-node scripts/test-locally.ts`);
