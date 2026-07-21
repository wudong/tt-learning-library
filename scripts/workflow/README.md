# Fix-Loop Workflow

A small orchestrator built on the **pi agent core** (`@earendil-works/pi-coding-agent`)
that turns remote feedback into reviewed, tested fixes. Two phases:

```
Phase 1 — sync   (agent-assisted, via the feedback-triage skill + bash)
  standalone feedback service (admin API)  ─►  a deepseek-v4-pro agent:
    • loads unprocessed feedback (status=new for this app)
    • lists existing OPEN workflow issues
    • decides per item: create NEW / APPEND to a similar open issue / GROUP several into one
    • creates/edits issues (gh) and writes back via PATCH (status=converted_to_issue + github_issue_url)
  Only status=new feedback is ever touched → idempotent. Re-run anytime.

Phase 2 — work   (LLM, one issue at a time)
  one issue ─► triage (deepseek-v4-pro) ─► comment
            ─► worktree + .wip/task.md
            ─► plan      (glm-5.2)       ─► plan into task.md, comment
            ─► implement (deepseek-v4-pro) ─► tests + local run + browser smoke test
            ─► review    (glm-5.2 high)  ─► APPROVED ? report & close : loop back to implement (≤3)
```

The skill lives at `scripts/workflow/feedback-triage.SKILL.md` (a normal pi
SKILL.md — copy it to `.pi/skills/feedback-triage/SKILL.md` to use it
interactively in pi). The sync agent loads it into its prompt and executes it
with `bash` (`gh` + `curl` + `jq`); the orchestrator only launches the agent
(after ensuring the admin token is available) and verifies afterward that no
feedback was left unprocessed.

Feedback is submitted by the UI to same-origin `/api/feedback`, which the API
**proxies** to the standalone feedback service (injecting `app_id`). See
`apps/api/src/routes/feedback.ts` and the service's `INTEGRATION.md`.

## Run

```bash
# Phase 1 — sync (agent-assisted)
bun run workflow:sync                 # analyze + create/append/group + PATCH writeback
bun run workflow:sync -- --dry-run    # plan only, no gh/PATCH writes

# Phase 2 — work one issue
bun run workflow:work -- --issue 5    # specific issue
bun run workflow:work -- --next       # lowest open "workflow"-labeled issue
```

(`bun run workflow` prints usage.)

## Configuration (env)

| Var | Default | Purpose |
|---|---|---|
| `FEEDBACK_SERVICE_URL` | `https://feedback.graceliu.uk` | standalone feedback service base URL |
| `FEEDBACK_APP_ID` | `tt-learning-library` | this project's namespace in the feedback service |
| `FEEDBACK_ADMIN_TOKEN` | — | admin bearer token; auto-fetched from `gcloud secrets … feedback-admin-token` if unset |
| `WORKFLOW_GH_REPO` | auto from `git remote` | `owner/repo` |
| `WORKFLOW_GH_LABELS` | `workflow,triage` | labels applied to issues |
| `WORKFLOW_MAX_ROUNDS` | `3` | implement/review loop cap |
| `WORKFLOW_TRIAGE_MODEL` | `ollama-cloud/deepseek-v4-pro` | sync analysis + work triage (+ `*_PROVIDER`, `*_THINKING`) |
| `WORKFLOW_PLAN_MODEL` | `ollama-cloud/glm-5.2` | |
| `WORKFLOW_IMPLEMENT_MODEL` | `ollama-cloud/deepseek-v4-pro` | |
| `WORKFLOW_REVIEW_MODEL` | `ollama-cloud/glm-5.2` | |

## Requirements

- `@earendil-works/pi-coding-agent` resolvable (installed globally; the wrapper sets `NODE_PATH`)
- `gh` CLI authenticated for the repo's origin
- `curl` + `jq` on PATH (sync reads/writes the feedback service admin API)
- `gcloud` authenticated to project `wudong-agent-master` (to fetch `feedback-admin-token`) — or set `FEEDBACK_ADMIN_TOKEN`
- `agent-browser` on PATH (used by the implement step for browser smoke tests)
- Bun (worktree runs `bun install`); `bun run db:up` for local Postgres

## Feedback → issue linkage

Feedback rows in the standalone service carry a `status` and `github_issue_url`.
The sync agent PATCHes each processed item to `status=converted_to_issue` with
the issue URL, so it leaves the `status=new` queue and is never re-processed.

## One-off migration

`scripts/workflow/migrate-feedback.ts` copied the legacy Postgres `feedback`
table into the service (POST `/feedback`) and preserved existing GitHub linkage
via PATCH. It's idempotent (dedup by `metadata.originalId`) and safe to re-run.

## Required `.wip/` artifacts (handover / fail-fast)

The work phase treats `.wip/` as its source of truth. A phase is only allowed to
advance if its required artifact exists and is non-empty:

- `.wip/task.md` — issue + running context
- `.wip/triage.md` — triage analysis
- `.wip/plan.md` — detailed implementation plan
- `.wip/state.json` — machine-readable checkpoint (`phase`, `round`, `lastSuccessfulStep`, …)
- `.wip/handover.md` — concise “next agent picks up here” summary
- `.wip/reports/implement-round-N.md`
- `.wip/reports/review-round-N.md`
- `.wip/reports/final-report.md`

If a model returns empty output or fails to write its required artifact, the
workflow aborts immediately instead of silently moving to the next phase.

## Notes

- Sync is agent-driven, so grouping decisions are non-deterministic — run
  `--dry-run` first to preview the plan.
- The workflow never deletes branches/worktrees; it only creates them.
- The reviewer runs with read-only file tools (read/grep/find/ls) + bash for tests,
  so it cannot silently edit the implementation.
- `.wip/` is git-ignored (the workflow ensures this).