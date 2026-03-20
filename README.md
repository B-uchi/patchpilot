# 🤖 PatchPilot

> **Autonomous security vulnerability remediation for GitLab**  
> You push code. GitLab scans it. PatchPilot fixes it.

PatchPilot is a GitLab Duo agent flow built for the [GitLab AI Hackathon](https://gitlab.devpost.com/). It watches your CI pipeline's SAST (security scan) results and autonomously generates code fixes using Claude AI — opening Merge Requests with the fix already written, explained, and mapped to compliance frameworks like OWASP and SOC 2.

**No more stale vulnerability backlogs.**

---

## How It Works

```
Code pushed → GitLab SAST scans → PatchPilot wakes up
                                         │
                              ┌──────────▼──────────┐
                              │   Agent 1: Scout     │
                              │   Reads SAST report  │
                              │   Filters noise      │
                              │   Ranks by severity  │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   Agent 2: Fixer     │
                              │   Fetches the file   │
                              │   Asks Claude to fix │
                              │   Opens a MR         │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   Agent 3: Scribe    │
                              │   Maps to OWASP/CWE  │
                              │   Posts audit note   │
                              └─────────────────────┘
                                         │
                              Human reviews → merges ✅
```

---

## Quick Start

### 1. Clone & install
```bash
git clone https://gitlab.com/gitlab-ai-hackathon/patchpilot.git
cd patchpilot
npm install
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env — add your GitLab token, project ID, and Anthropic API key
```

### 3. Test locally (no API calls, safe)
```bash
# Generate a mock SAST report
npm run seed:mock

# Run Scout agent against it — see triage results printed to terminal
npm run test:local
```

### 4. Run in dry-run mode (reads APIs, but no MRs opened)
```bash
# Set DRY_RUN=true in .env, then:
npm run dev -- ./scripts/output/mock-sast-report.json
```

### 5. Run for real
```bash
# Set DRY_RUN=false in .env
# Trigger via GitLab CI or run manually with a real SAST report:
npm run dev -- /path/to/gl-sast-report.json
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITLAB_TOKEN` | ✅ | Personal access token (api + read/write_repository scopes) |
| `GITLAB_PROJECT_ID` | ✅ | e.g. `mybusiness/my-app` |
| `GITLAB_BASE_URL` | ✅ | e.g. `https://gitlab.com` |
| `ANTHROPIC_API_KEY` | ✅ | From [console.anthropic.com](https://console.anthropic.com) |
| `MIN_SEVERITY` | optional | `critical` / `high` / `medium` / `low` (default: `high`) |
| `PATCH_BRANCH_PREFIX` | optional | default: `patchpilot/fix` |
| `DRY_RUN` | optional | `true` = no real commits/MRs (default: `false`) |

---

## Project Structure

```
patchpilot/
├── agents/
│   ├── scout/          # Agent 1 — triage & classify
│   │   ├── index.ts
│   │   ├── parser.ts      parses GitLab SAST JSON
│   │   └── classifier.ts  filters noise, ranks severity
│   ├── fixer/          # Agent 2 — generate & commit fixes
│   │   ├── index.ts
│   │   ├── claude-client.ts  calls Anthropic API
│   │   └── gitlab-mr.ts      creates branch + MR
│   └── scribe/         # Agent 3 — compliance & audit
│       ├── index.ts
│       ├── compliance-mapper.ts  OWASP/CWE/SOC2 mapping
│       └── dashboard.ts          builds audit markdown
├── flow/
│   ├── index.ts        # Entry point (CLI + CI)
│   └── orchestrator.ts # Runs Scout → Fixer → Scribe
├── lib/
│   ├── types.ts        # All TypeScript types
│   ├── gitlab-api.ts   # GitLab REST client
│   ├── logger.ts       # Logging utility
│   └── utils.ts        # Helpers
├── config/
│   └── index.ts        # Typed config from env vars
├── scripts/
│   ├── seed-mock-scan.ts    generate test data
│   └── test-locally.ts     run without live APIs
└── .gitlab/
    ├── agent.yaml      # GitLab Duo agent registration
    └── flow.yaml       # GitLab Duo Flow definition
```

---

## Built With

- **GitLab Duo Agent Platform** — trigger, tools, and flow orchestration
- **Anthropic Claude** (via GitLab integration) — AI-powered code fix generation
- **TypeScript / Node.js** — runtime
- **GitLab REST API** — branch creation, commits, MRs

---

## License

MIT — see [LICENSE](LICENSE)

Built for the [GitLab AI Hackathon 2026](https://gitlab.devpost.com/) 🏆
