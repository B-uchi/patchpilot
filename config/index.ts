// ─────────────────────────────────────────────────────────────────────────────
// config/index.ts
// Loads environment variables and exports a typed config object.
//
// Works in two contexts:
//   LOCAL:  reads from .env file (copy from .env.example)
//   CI:     reads from GitLab CI/CD Variables injected at runtime
//           GitLab injects CI_PROJECT_ID as a number — we handle both formats
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { Severity } from "../lib/types";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `  Locally:  copy .env.example → .env and fill it in\n` +
      `  In CI:    Settings → CI/CD → Variables → add "${key}"`
    );
  }
  return value;
}

export const config = {
  gitlab: {
    token: requireEnv("GITLAB_TOKEN"),

    // Accepts EITHER format GitLab might give us:
    //   "12345678"          — numeric ID from CI_PROJECT_ID (CI context)
    //   "mybusiness/my-app" — path slug (local .env context)
    // The GitLab API accepts both — we just pass it straight through.
    projectId: requireEnv("GITLAB_PROJECT_ID"),

    // Trailing slash stripped so URL building is always clean
    baseUrl: (process.env.GITLAB_BASE_URL ?? "https://gitlab.com").replace(/\/$/, ""),
  },
  anthropic: {
    apiKey: requireEnv("ANTHROPIC_API_KEY"),
  },
  patchPilot: {
    minSeverity:  (process.env.MIN_SEVERITY ?? process.env.PATCHPILOT_MIN_SEVERITY ?? "high") as Severity,
    branchPrefix: process.env.PATCH_BRANCH_PREFIX ?? "patchpilot/fix",
    // DRY_RUN=true → no real branches, commits, or MRs created
    dryRun:       process.env.DRY_RUN === "true" || process.env.PATCHPILOT_DRY_RUN === "true",
  },
} as const;
