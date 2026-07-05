# TT Learning Library — Deployment

> Created: 2026-07-05  
> Updated: 2026-07-05 (Aiven provisioned, Render pending)

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

## Render Setup (TODO — requires manual creation via dashboard or CLI)

### API Service

Create a **Web Service** on Render:

| Setting | Value |
|---|---|
| Name | `tt-learning-api` |
| Repository | `https://github.com/wudong/tt-learning-library` |
| Branch | `main` |
| Root directory | `.` |
| Runtime | Node |
| Region | Frankfurt |
| Plan | Free |
| Build command | `bun install && bun run --cwd packages/shared build && bun run --cwd packages/db build && bun run --cwd apps/api build` |
| Start command | `bun run --cwd apps/api dev` |

Environment variables:

```text
NODE_VERSION=20
DATABASE_URL=<see-1password>
WEB_ORIGIN=*
HOSTED_AUTH_REQUIRED=false
NODE_TLS_REJECT_UNAUTHORIZED=0
```

After creation, note the `.onrender.com` URL (e.g., `tt-learning-api-XXXX.onrender.com`).

Verify:
```bash
curl https://tt-learning-api-XXXX.onrender.com/api/health
curl https://tt-learning-api-XXXX.onrender.com/api/ready
```

### Static Site

Create a **Static Site** on Render:

| Setting | Value |
|---|---|
| Name | `tt-learning` |
| Repository | `https://github.com/wudong/tt-learning-library` |
| Branch | `main` |
| Root directory | `.` |
| Build command | `bun install && bun run --cwd packages/shared build && bun run --cwd apps/web build` |
| Publish path | `apps/web/dist` |

Environment variables:

```text
NODE_VERSION=20
VITE_API_URL=/api
```

Rewrite routes:

| Source | Destination | Type |
|---|---|---|
| `/api/*` | `https://tt-learning-api-XXXX.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

**Important:** Replace `XXXX` with the actual API service hostname slug.

Verify:
```bash
curl https://tt-learning-XXXX.onrender.com/health.json
curl https://tt-learning-XXXX.onrender.com/api/health
```

### Custom Domain (optional)

Register a custom domain on the Render static service. For Cloudflare DNS,
point the hostname to the DNS target Render provides.

### Keep-Awake Ping

Use cron-job.org:

```text
Dashboard: https://console.cron-job.org/dashboard
Job name: tt-learning-api-health
URL: https://tt-learning-XXXX.onrender.com/api/health  (or custom domain)
Method: GET
Schedule: every 10 minutes
Expected HTTP status: 200
```

## Post-Deploy Verification

```bash
# Health
curl -fsS https://YOUR_DOMAIN/health.json
curl -fsS https://YOUR_DOMAIN/api/health
curl -fsS https://YOUR_DOMAIN/api/ready

# Feedback
curl -fsS -X POST https://YOUR_DOMAIN/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{"message_type":"general","message":"Deploy test"}'

# API functionality
curl -fsS https://YOUR_DOMAIN/api/inbox
curl -fsS https://YOUR_DOMAIN/api/search?q=serve
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
