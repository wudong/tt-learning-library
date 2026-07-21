---
name: feedback-triage
description: Triage user feedback from the standalone feedback service into GitHub issues. Load unprocessed feedback (status=new) for this app via the admin API, decide per batch whether to create a new issue, append to an existing similar OPEN issue, or group several items into one issue, then write the result back via PATCH (status=converted_to_issue + github_issue_url) so feedback is marked processed.
allowed-tools: Bash(gh:*), Bash(curl:*), Bash(jq:*), Bash(git:*), Read, Write
---

# Feedback → Issues triage (standalone feedback service)

You turn raw user feedback into a small, well-organized set of GitHub issues.
Feedback lives in the standalone feedback service, not a local DB. You run in the
repo root with `gh`, `curl`, `jq`, and `git` on PATH.

## Environment

- `FEEDBACK_SERVICE_URL` — base URL of the feedback service (e.g. `https://feedback.graceliu.uk`).
- `FEEDBACK_APP_ID` — this project's namespace (e.g. `tt-learning-library`). Use it on every request.
- `FEEDBACK_ADMIN_TOKEN` — bearer token for the admin API (already set in env).
- Repo: detect with `git remote get-url origin` (parse `owner/repo`), then pass `--repo owner/repo` to every `gh` call. Run `gh repo view --json nameWithOwner` once to confirm. Build issue URLs as `https://github.com/<owner/repo>/issues/<N>`.
- Labels to use: `workflow` and `triage`.

## Step 1 — load unprocessed feedback (status=new for this app)

```bash
curl -s "$FEEDBACK_SERVICE_URL/admin/feedback?app_id=$FEEDBACK_APP_ID&status=new&limit=200" \
  -H "Authorization: Bearer $FEEDBACK_ADMIN_TOKEN" | jq '.data'
```

Each item: `id` (UUID), `message_type`, `message`, `name`, `email`, `page_path`, `page_title`, `metadata`, `created_at`.
If `data` is empty → print "No unprocessed feedback." and stop.

To inspect one field, e.g. ids: `… | jq -r '.data[].id'`.

## Step 2 — load existing OPEN workflow issues (append candidates)

```bash
gh issue list --repo <owner/repo> --label workflow --state open --json number,title,body --limit 100
```

Read each candidate's body before deciding to append.

## Step 3 — decide: APPEND / GROUP-NEW / NEW

For every unprocessed feedback id, choose exactly one resolution:

- **APPEND** to an existing OPEN issue when the feedback is about the **same problem** (confirm by reading the issue body). Multiple new feedback items can append to the same issue.
- **GROUP-NEW**: several feedback items about the **same problem** with **no matching open issue** → create ONE new issue covering all of them.
- **NEW**: a standalone, unrelated item → its own new issue.

Hard rules:
- Every unprocessed feedback id must be resolved exactly once (created, grouped, or appended).
- Never create a duplicate of an open issue — reuse it (APPEND).
- Prefer fewer, well-scoped issues. Group related items.
- Titles ≤ 80 chars, prefixed with the type, e.g. `[bug] …`, `[feature] …`.
- Issue body = a clear problem statement + suggested acceptance hints + a `## Source feedback` section listing each included feedback id (UUID) with its message and a hidden marker:
  `<!-- workflow:feedback-id=UUID -->`

## Step 4 — ensure labels exist (create if missing, ignore "already exists")

```bash
gh label create workflow --repo <owner/repo> --color 5319e7 --description "managed by workflow" 2>/dev/null || true
gh label create triage  --repo <owner/repo> --color 7047ff --description "managed by workflow" 2>/dev/null || true
```

## Step 5 — execute

For each NEW / GROUP-NEW:
- Write the body to a temp file, then:
  ```bash
  gh issue create --repo <owner/repo> --title "…" --body-file /tmp/issue-body.md --label workflow --label triage
  ```
  The command prints the new issue URL. Parse the number (`…/issues/N`).

For each APPEND to issue #N:
- Get the current body: `gh issue view N --repo <owner/repo> --json body -q .body > /tmp/cur.md`
- Append a section:
  ```
  ## Additional feedback (YYYY-MM-DD)
  ### [type] <first line of message>
  <message>
  — from <name> · page: <path> · feedback id: `UUID`
  <!-- workflow:feedback-id=UUID -->
  ```
- `gh issue edit N --repo <owner/repo> --body-file /tmp/new.md`
- Optionally: `gh issue comment N --repo <owner/repo> --body "Added related feedback."`

## Step 6 — write back (mark processed) IMMEDIATELY after each issue is created/updated

For every feedback UUID resolved under issue #N, PATCH the service to set
`status=converted_to_issue` and `github_issue_url`:

```bash
curl -s -X PATCH "$FEEDBACK_SERVICE_URL/admin/feedback/$UUID" \
  -H "Authorization: Bearer $FEEDBACK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"converted_to_issue\",\"github_issue_url\":\"https://github.com/<owner/repo>/issues/$N\"}"
```

Do this right after each issue is created/edited so a crash never loses linkage.
Grouped feedback UUIDs all get PATCHed to the same issue URL. Expect
`{"success":true,"id":"…","status":"converted_to_issue","github_issue_url":"…","updated_at":"…"}`.

## Step 7 — verify and report

```bash
curl -s "$FEEDBACK_SERVICE_URL/admin/feedback?app_id=$FEEDBACK_APP_ID&status=new&limit=50" \
  -H "Authorization: Bearer $FEEDBACK_ADMIN_TOKEN" | jq '.data | length'
```
This must be `0`. Then print a summary table: `feedback UUID → issue #N → created | appended | grouped-with: [UUIDs]`.

## Dry-run mode

If told to dry-run: do Step 1–3 only. Do NOT run `gh issue create/edit/comment` and do NOT run any PATCH. Output the plan as a table: `feedback UUID → action (new/append #N/group with [UUIDs]) → proposed title`.

## Idempotency

Only `status=new` feedback is ever processed. PATCHing moves it to
`converted_to_issue`, so re-running is safe and does nothing once all feedback is
linked. Never recreate an issue for a feedback row that is already linked.