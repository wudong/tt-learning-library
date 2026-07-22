# TT Learning Library — Deployment

> Created: 2026-07-05  
> Updated: 2026-07-22 (Supabase database/auth migration completed and verified on Render)
> **Credentials vault**: `/Users/wudong/repo/gcloud/vault/tt-learning-library/secrets.md`  
> **GCP Secret Manager**: `gcloud secrets versions access latest --secret="tt-learning-library-full-config" | jq`

This document describes how to deploy the TT Learning Library on Render
(frontend + backend) with Supabase PostgreSQL and Supabase Auth.

## Target Deployment Architecture

```
Render Static Site (tt-learning)
  ├── rewrite /api/* → Render Web Service
  └── custom domain via Cloudflare

Render Web Service (tt-learning-api)
  └── Supabase PostgreSQL + Auth (tt-learning)
```

- **Frontend**: Render Static Site, `tt-learning`
- **Backend API**: Render Web Service, `tt-learning-api`
- **Database/Auth**: Supabase project `tt-learning` (`jrabgxumevaduailkvhj`)
- **Keep-awake**: cron-job.org ping every 10 minutes

## Service Inventory

### Supabase PostgreSQL and Auth

| Field | Value |
|---|---|
| Project | `tt-learning` |
| Project ref | `jrabgxumevaduailkvhj` |
| Region | `eu-west-1` |
| PG Version | 17.6 |
| Runtime connection | Supavisor session pooler, port 5432 |
| Migration connection | direct host, port 5432 |
| Credentials | GCP Secret Manager, `tt-learning-library-supabase-*` |
| Auth | passwordless email through Supabase Auth |
| Status | ✅ ACTIVE_HEALTHY; schema/data migrated and count-verified |

### GitHub Repository

| Field | Value |
|---|---|
| URL | `https://github.com/wudong/tt-learning-library` |
| Branch | `main` |
| Status | ✅ Pushed |

### Render API Service

| Field | Value |
|---|---|
| Service ID | `srv-d95clokvikkc73djd0tg` |
| URL | `https://tt-learning-api.onrender.com` |
| Dashboard | https://dashboard.render.com/web/srv-d95clokvikkc73djd0tg |
| Status | ✅ Live |

### Render Static Site

| Field | Value |
|---|---|
| Service ID | `srv-d95clt4vikkc73djd4ag` |
| URL | `https://tt-learning.onrender.com` |
| Dashboard | https://dashboard.render.com/static/srv-d95clt4vikkc73djd4ag |
| Status | ✅ Live |

Rewrite routes:
- `/api/*` → `https://tt-learning-api.onrender.com/api/*` (route: `rdr-d95clvnaqgkc73evluf0`)
- `/share-target` → `https://tt-learning-api.onrender.com/share-target` (must precede the SPA fallback and preserve POST bodies)
- `/*` → `/index.html` (route: `rdr-d95clvgjs32c73fo3k50`)

## Verification Results (2026-07-05)

| Endpoint | Result |
|---|---|
| `GET /api/health` | `{"ok":true}` ✅ |
| `GET /api/ready` | `{"ready":true,"database":true}` ✅ |
| `GET /health.json` | `{"status":"ok"}` ✅ |
| `GET /api/health` (via proxy) | `{"ok":true}` ✅ |
| `POST /api/feedback` | `{"success":true}` ✅ |

## Keep-Awake Ping

Use cron-job.org:

```text
Dashboard: https://console.cron-job.org/dashboard
Job name: tt-learning-api-health
URL: https://tt-learning-api.onrender.com/api/health
Method: GET
Schedule: every 10 minutes
Expected HTTP status: 200
```

## Database migration notes (2026-07-22)

- A full custom-format backup of the Aiven `public` schema was created before
  target writes. Aiven remains the rollback source until the Supabase cutover is
  accepted.
- All application migrations were applied to Supabase, followed by a data-only
  restore excluding migration bookkeeping.
- Source and target counts matched across all 17 application tables: 1 user,
  12 graph nodes, 2 graph edges, 4 videos, 6 topics, 2 notes, 5 Inbox items,
  4 feedback rows, and zero rows in the remaining tables.
- Row-level security is enabled on all 17 private/application tables with no
  browser Data API policies. Private data remains accessible only through Hono.
- The existing `user_local` rows transfer transactionally on first login only
  when the verified Supabase email matches `LEGACY_OWNER_EMAIL`.

## Historical Aiven setup notes (2026-07-05)

- The Aiven `ttlearn` app user initially lacked `CREATE` on the `public` schema (the
  database is owned by `avnadmin`). Without it, `migrateToLatest` crashed on
  startup, which is why earlier Render deploys had status `update_failed` and the
  service kept serving an old SQLite-based deploy.
- Fix: as `avnadmin`, ran `GRANT CREATE, USAGE ON SCHEMA public TO ttlearn` (see
  the credentials vault for the `avnadmin` password), then applied migrations
  directly against Aiven with `DATABASE_URL=... bun run db:migrate`. All 18 tables
  and 2 migrations are now present in `tt_learning`.
- Verified end-to-end: a `POST /api/feedback` through the live Render API
  produced a row readable directly from Aiven, confirming the live API is
  connected to Aiven Postgres (not the SQLite fallback).

## Local Development

```bash
bun install
bun run db:migrate
bun run dev          # API on :3003, Web on :5174
```

The local dev uses PostgreSQL via docker-compose (`bun run db:up`, host port 5433,
database `tt_learning`, owner `ttlearn`). `DATABASE_URL` must be a
`postgres://` / `postgresql://` connection string; `sslmode=require` is
honored for hosted (Aiven) connections. SQLite support has been deprecated.

## Aiven CLI / API Access

```bash
# Login
AIVEN_PASSWORD="$(gcloud secrets versions access latest --secret=tt-learning-library-aiven-account-password)" \
avn user login "$(gcloud secrets versions access latest --secret=tt-learning-library-aiven-account-email)"

# List services
avn service list --project tt-learn

# Get connection info
avn service connection-info pg uri tt-learning-db --project tt-learn
```
