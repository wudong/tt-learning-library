# TT Learning Library — Deployment

> Created: 2026-07-05

This document describes how to deploy the TT Learning Library on Render
(frontend + backend) with an Aiven PostgreSQL database. It follows the same
pattern proven with the tt-players deployment.

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
- **Database**: Aiven PostgreSQL, project `tt-learning` at
  https://console.aiven.io/account/a4c7bc15d1a1/project/tt-learning
- **Keep-awake**: cron-job.org ping every 10 minutes

## Prerequisites

Install CLIs:

```bash
render --version      # Render CLI
avn --version         # Aiven CLI
```

Authenticate:

```bash
render login
avn user login
```

## 1. Create the Aiven Database

Create a PostgreSQL service on the free plan in `do-fra` (close to Render Frankfurt):

```bash
avn service create tt-learning-db \
  --service-type pg \
  --cloud do-fra \
  --plan free-1-5gb \
  --project tt-learning
```

Create the application database:

```bash
avn service database-create tt-learning-db tt_learning \
  --project tt-learning
```

Get the connection string:

```bash
avn service connection-info tt-learning-db --project tt-learning
```

The `DATABASE_URL` must include `?sslmode=require`. Example:

```
postgres://avnadmin:...@tt-learning-db-....aivencloud.com:21900/tt_learning?sslmode=require
```

## 2. Apply Database Migrations

Once the database is created, apply migrations. From this repo:

```bash
DATABASE_PATH=:memory: bun run db:migrate  # verify locally first

# For remote: set DATABASE_URL and run migration
DATABASE_URL="postgres://.../tt_learning?sslmode=require" bun packages/db/src/migrations/run.ts
```

## 3. Create the Render API Service

Create a Render **Web Service** from the GitHub repository:

| Setting | Value |
|---|---|
| Name | `tt-learning-api` |
| Repository | your GitHub repo URL |
| Branch | `main` |
| Runtime | Node |
| Region | Frankfurt |
| Plan | Free |
| Build command | `bun install && bun run --cwd packages/shared build && bun run --cwd packages/db build && bun run --cwd apps/api build` |
| Start command | `bun run --cwd apps/api dev` |

### Environment Variables

```text
NODE_VERSION=20
DATABASE_URL=postgres://.../tt_learning?sslmode=require
WEB_ORIGIN=https://tt-learning.graceliu.uk
HOSTED_AUTH_REQUIRED=false
```

The Render API will be available at `https://tt-learning-api-XXXX.onrender.com`.
Verify the health endpoint:

```bash
curl https://tt-learning-api-XXXX.onrender.com/api/health
# → {"data":{"ok":true,"service":"tt-learning-library-api"}}

curl https://tt-learning-api-XXXX.onrender.com/api/ready
# → {"data":{"ready":true,"database":true}}
```

## 4. Create the Render Static Site

Create a Render **Static Site** from the same GitHub repository:

| Setting | Value |
|---|---|
| Name | `tt-learning` |
| Repository | your GitHub repo URL |
| Branch | `main` |
| Root directory | `.` |
| Build command | `bun install && bun run --cwd packages/shared build && bun run --cwd apps/web build` |
| Publish path | `apps/web/dist` |

### Environment Variables

```text
NODE_VERSION=20
VITE_API_URL=/api
```

### Rewrite Routes

Add these rewrite rules to the static site:

| Source | Destination | Type |
|---|---|---|
| `/api/*` | `https://tt-learning-api-XXXX.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

The `/api/*` rewrite proxies browser API calls to the backend without exposing
the API hostname in frontend code. The catch-all `/*` rewrite enables the SPA
router for deep links.

**Important:** If you recreate the API service, the API hostname slug changes.
Update the rewrite route destination to match the new API hostname.

Verify:

```bash
curl https://tt-learning-XXXX.onrender.com/health.json
# → {"status":"ok","updated":"2026-07-05","service":"tt-learning-library"}

curl https://tt-learning-XXXX.onrender.com/api/health
# → routed to API service → {"data":{"ok":true,...}}
```

## 5. Custom Domain (Cloudflare)

Register the custom domain on the Render static service. For example:

```
tt-learning.graceliu.uk
```

In Cloudflare DNS, point the hostname to Render using the DNS target Render
provides for the custom domain. After DNS propagates, Render should report the
custom domain as verified.

Verify:

```bash
curl https://tt-learning.graceliu.uk/health.json
curl https://tt-learning.graceliu.uk/api/health
```

## 6. Keep-Awake Pings

Render free web services spin down after ~15 minutes of inactivity. Use
cron-job.org to keep the API warm:

```
Dashboard: https://console.cron-job.org/dashboard
Job name: tt-learning-api-health
URL: https://tt-learning.graceliu.uk/api/health
Method: GET
Schedule: every 10 minutes
Expected HTTP status: 200
```

The `/api/health` endpoint is lightweight (no DB query), making it safe for
frequent pings.

Optional frontend monitor:

```
Job name: tt-learning-frontend-health
URL: https://tt-learning.graceliu.uk/health.json
Method: GET
Schedule: every 10 minutes
Expected HTTP status: 200
```

## 7. Post-Deploy Verification

Run these checks after every deployment:

```bash
# Health endpoints
curl -fsS https://tt-learning.graceliu.uk/health.json
curl -fsS https://tt-learning.graceliu.uk/api/health
curl -fsS https://tt-learning.graceliu.uk/api/ready

# API functionality
curl -fsS https://tt-learning.graceliu.uk/api/inbox
curl -fsS https://tt-learning.graceliu.uk/api/search?q=serve

# Feedback endpoint
curl -fsS -X POST https://tt-learning.graceliu.uk/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{"message_type":"general","message":"Deployment verification test"}'
```

Check that the frontend bundle does not hardcode the API hostname:

```bash
curl -sS https://tt-learning.graceliu.uk | grep -o '/api' | head -5
# Should show relative /api paths, not absolute Render URLs
```

## Local Development vs. Production

### Local
- SQLite (`bun:sqlite`) via `DATABASE_PATH=./.data/app.db`
- `HOSTED_AUTH_REQUIRED=false` (trusts dev user)
- `bun run dev` starts both API and web

### Production (Render + Aiven)
- PostgreSQL via `DATABASE_URL` (Aiven connection string)
- `HOSTED_AUTH_REQUIRED=false` for MVP (local-only mode)
- Static site serves frontend; API is a separate web service
- Keep-awake ping keeps free Render service from sleeping

## Retiring Old SQLite Path

When moving to PostgreSQL on Aiven:
1. Update `packages/db` to support PostgreSQL dialect via Kysely
2. Keep `bun:sqlite` adapter for local development and testing
3. Use `DATABASE_URL` env var to detect production (PostgreSQL) vs local (SQLite)

The current codebase already separates the dialect adapter in
`packages/db/src/database/createDb.ts`. PostgreSQL support requires a
Kysely `PostgresDialect` adapter in the same location.
