// ─────────────────────────────────────────────────────────────────────────────
// lib/logger.ts
// Dead-simple logger. Prefixes every line with a timestamp + agent name.
// Usage: const log = logger("Scout")
// ─────────────────────────────────────────────────────────────────────────────

type Level = "info" | "warn" | "error" | "success" | "debug";

const ICONS: Record<Level, string> = {
  info:    "·",
  warn:    "⚠",
  error:   "✗",
  success: "✓",
  debug:   "→",
};

export function logger(agentName: string) {
  const prefix = `[PatchPilot:${agentName}]`;

  function log(level: Level, message: string, data?: unknown) {
    const ts = new Date().toISOString();
    const icon = ICONS[level];
    const line = `${ts} ${icon} ${prefix} ${message}`;

    if (level === "error") {
      console.error(line, data ?? "");
    } else if (level === "warn") {
      console.warn(line, data ?? "");
    } else {
      console.log(line, data ?? "");
    }
  }

  return {
    info:    (msg: string, data?: unknown) => log("info", msg, data),
    warn:    (msg: string, data?: unknown) => log("warn", msg, data),
    error:   (msg: string, data?: unknown) => log("error", msg, data),
    success: (msg: string, data?: unknown) => log("success", msg, data),
    debug:   (msg: string, data?: unknown) => log("debug", msg, data),
  };
}
