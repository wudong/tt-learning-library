# TT Learning Library — Deployment

> Created: 2026-07-05  
> Updated: 2026-07-05 (✅ Deployed — Aiven + Render live)  
> **Credentials vault**: `/Users/wudong/repo/gcloud/vault/tt-learning-library/secrets.md`

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
| Account | `wudongliu+tt-learning@gmail.com` |
| Password | `Yuepan200*TTlearn!` |
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
AIVEN_PASSWORD="Yuepan200*TTlearn!" avn user login wudongliu+tt-learning@gmail.com

# List services
avn service list --project tt-learn

# Get connection info
avn service connection-info pg uri tt-learning-db --project tt-learn
```
