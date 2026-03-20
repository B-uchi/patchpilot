// ─────────────────────────────────────────────────────────────────────────────
// lib/utils.ts
// Small helpers used across all agents.
// ─────────────────────────────────────────────────────────────────────────────

import { randomBytes } from "crypto";
import { Severity } from "./types";

/** Generate a short unique ID for this PatchPilot run */
export function generateRunId(): string {
  return `pp-${Date.now()}-${randomBytes(3).toString("hex")}`;
}

/** Convert severity string to a numeric weight for sorting */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 5,
  high:     4,
  medium:   3,
  low:      2,
  info:     1,
  unknown:  0,
};

/** True if the finding meets or exceeds the configured minimum severity */
export function meetsMinSeverity(severity: Severity, minSeverity: Severity): boolean {
  return SEVERITY_WEIGHT[severity] >= SEVERITY_WEIGHT[minSeverity];
}

/** Slugify a string for use in branch names */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/** Build a safe git branch name for a fix */
export function buildBranchName(prefix: string, findingId: string, fileName: string): string {
  return `${prefix}-${slugify(findingId)}-${slugify(fileName)}`;
}

/** Pause execution for ms milliseconds (useful between API calls) */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wrap a value as ISO timestamp string */
export function now(): string {
  return new Date().toISOString();
}
