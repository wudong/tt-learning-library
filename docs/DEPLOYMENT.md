# TT Learning Library — Deployment

> Created: 2026-07-05  
> Updated: 2026-07-05 (✅ Deployed — Aiven + Render live; ✅ Migrations applied to Aiven; ✅ Live API verified against Aiven Postgres)  
> **Credentials vault**: `/Users/wudong/repo/gcloud/vault/tt-learning-library/secrets.md`  
> **GCP Secret Manager**: `gcloud secrets versions access latest --secret="tt-learning-library-full-config" | jq`

This document describes how to deploy the TT Learning Library on Render
(frontend + backend) with an Aiven PostgreSQL database.

## Target Deployment Architecture

```
Render Static Site (tt-learning)
  ├── rewrite /api/* → Render Web Service
  └── custom domain via Cloudflare

Render Web Service (tt-learning-api)
  └── Aiven PostgreSQL (tt-learning-db)
```

- **Frontend**: Render Static Site, `tt-learning`
- **Backend API**: Render Web Service, `tt-learning-api`
- **Database**: Aiven PostgreSQL, project `tt-learn`
- **Keep-awake**: cron-job.org ping every 10 minutes

## Service Inventory

### Aiven PostgreSQL

| Field | Value |
|---|---|
| Project | `tt-learn` |
| Account | (see GCP Secret Manager: `tt-learning-library-aiven-account-email`) |
| Password | (see GCP Secret Manager: `tt-learning-library-aiven-account-password`) |
| Service | `tt-learning-db` |
| Plan | `free-1-1gb` (1 CPU, 1 GB RAM, 1 GB disk) |
| Cloud | `do-fra` (DigitalOcean Frankfurt) |
| PG Version | 17.10 |
| Host | `tt-learning-db-tt-learn.h.aivencloud.com` |
| Port | `10990` |
| Database | `tt_learning` |
| User | `ttlearn` |
| Password | (see 1Password / Aiven console) |
| DATABASE_URL | (see 1Password / Aiven console) |
| Status | ✅ RUNNING, verified via psql |

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

## Database setup notes (2026-07-05)

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

The local dev uses SQLite (`bun:sqlite`) via `DATABASE_PATH=./.data/app.db`.
When `DATABASE_URL` is set and starts with `postgres://`, the app
automatically switches to `PostgresDialect` (connection pooling, SSL).

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
