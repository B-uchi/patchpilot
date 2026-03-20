// ─────────────────────────────────────────────────────────────────────────────
// agents/fixer/claude-client.ts
// This is the core AI call — sends vulnerable code to Claude, gets the fix back.
// It's just a fetch() to the Anthropic API, same pattern as any REST call
// you'd write in Express.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { FixRequest } from "../../lib/types";
import { logger } from "../../lib/logger";

const log = logger("Fixer:Claude");

export interface ClaudeFixResult {
  patchedContent: string;
  explanation: string;
}

// Build the prompt we send to Claude.
// Good prompts are specific — we tell Claude exactly what we need back.
function buildPrompt(req: FixRequest): string {
  const { finding, fileContent } = req;

  return `You are a senior security engineer performing a code security fix.

## Vulnerability Details
- **Name**: ${finding.name}
- **Severity**: ${finding.severity.toUpperCase()}
- **File**: ${finding.location.file}
- **Line**: ${finding.location.start_line}${finding.location.end_line ? `–${finding.location.end_line}` : ""}
- **Description**: ${finding.description}
${finding.owaspCategory ? `- **OWASP**: ${finding.owaspCategory}` : ""}
${finding.cweId ? `- **CWE**: ${finding.cweId}` : ""}
${finding.solution ? `- **Suggested fix**: ${finding.solution}` : ""}

## File Content (full file)
\`\`\`
${fileContent}
\`\`\`

## Your Task
1. Fix ONLY the specific vulnerability described above. Do NOT refactor unrelated code.
2. Preserve all existing functionality — this must not break anything.
3. Keep the same coding style, naming conventions, and formatting as the original.

## Response Format
Respond with ONLY a JSON object — no markdown, no explanation outside the JSON:

{
  "patchedContent": "<the complete fixed file content as a string>",
  "explanation": "<2-3 sentence plain English explanation of what was wrong and how you fixed it>"
}`;
}

export async function generateFix(
  client: Anthropic,
  req: FixRequest
): Promise<ClaudeFixResult> {
  log.info(
    `Asking Claude to fix: ${req.finding.name} in ${req.finding.location.file}`
  );

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: buildPrompt(req),
      },
    ],
  });

  // Extract the text response
  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  // Parse the JSON Claude returns
  try {
    // Strip any accidental markdown fences
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ClaudeFixResult;

    if (!parsed.patchedContent || !parsed.explanation) {
      throw new Error("Missing patchedContent or explanation in Claude response");
    }

    log.success(`Claude generated fix — ${parsed.explanation.slice(0, 80)}...`);
    return parsed;
  } catch (err) {
    log.error("Failed to parse Claude response as JSON", { responseText, err });
    throw new Error(`Claude returned unparseable response: ${String(err)}`);
  }
}
