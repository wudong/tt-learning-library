# TT Learning Library — Deployment

> Updated: 2026-07-24

This public runbook describes the deployment shape without publishing credential
locations, provider resource IDs, project references, or secret-manager names.
Keep the exact infrastructure inventory and recovery credentials in a private
operations system.

## Architecture

```text
Static web host
  ├── /api/*       → Hono API service
  ├── /share-target → Hono API service (preserve POST body and status)
  └── /*           → /index.html SPA fallback

Hono API service
  └── managed PostgreSQL + Supabase Auth
```

The `/share-target` rule must precede the SPA fallback. Public `/s/:token` pages
are handled by the frontend SPA and retrieve an allowlisted projection from
`/api/public/share/:token`.

## Required environment

Configure values equivalent to those documented in `.env.example`:

- `DATABASE_URL`
- `DATABASE_CA_CERT` when required by the database provider
- `WEB_ORIGIN`
- `PUBLIC_APP_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `AUTH_COOKIE_SECRET`
- `HOSTED_AUTH_REQUIRED=true`
- `LEGACY_OWNER_EMAIL` only while the one-time legacy ownership transfer is needed

Never commit real values. Never disable TLS certificate verification.

## Build and deploy

### Web

```bash
bun install --frozen-lockfile
bun run --cwd apps/web build
```

Publish `apps/web/dist` as the static-site output.

### API

```bash
bun install --frozen-lockfile
bun run --cwd apps/api build
```

Run the API using the command configured by `apps/api/package.json`.

## Migrations

The migration runner uses a PostgreSQL advisory lock and applies pending
migrations in one transaction. Production should run migrations before starting
the new application revision:

```bash
bun install --frozen-lockfile
bun run db:migrate
```

After the pre-deploy command is configured, set:

```text
AUTO_MIGRATE=false
```

This prevents normal API startup from changing the database. For backwards
compatibility, startup migrations remain enabled unless explicitly disabled.

`GET /api/ready` returns HTTP 503 when the database is unavailable or migrations
are pending. The deployment platform should not route traffic until readiness
returns HTTP 200.

## Route configuration

Configure rewrites in this order:

1. `/share-target` → API `/share-target`, preserving POST bodies.
2. `/api/*` → API `/api/*`.
3. `/*` → frontend `/index.html`.

Set `PUBLIC_APP_ORIGIN` to the user-facing frontend origin so generated share
links never point at the API host.

## Verification

After deployment, verify:

```text
GET  /api/health                         → 200
GET  /api/ready                          → 200, ready=true, no pending migrations
POST /api/feedback                       → expected success response
POST /share-target                       → 303 redirect without caching
POST /api/share-links                    → shareUrl uses PUBLIC_APP_ORIGIN
GET  /s/<valid-token>                    → public page without login
GET  /api/public/share/<valid-token>     → allowlisted projection only
DELETE /api/share-links/<id>             → subsequent public request unavailable
```

Also install the PWA on a supported Android device and verify native share-target
capture, authentication handoff, and update prompts.

## Database and privacy controls

- Use the managed PostgreSQL session pooler for the persistent API when recommended.
- Use a direct or migration-compatible connection for the pre-deploy migration command.
- Enable row-level security on private application tables without browser Data API policies.
- Access private data only through the authenticated Hono API.
- Store only hashed share tokens and a safe prefix.
- Keep database backups encrypted and access-controlled.

## Backup and restore

Before schema changes or provider migration:

1. Create a provider snapshot or `pg_dump` custom-format backup.
2. Record the migration version and application commit.
3. Restore into a clean non-production database.
4. Run `bun run db:status` and application smoke tests against the restored data.
5. Record the restore date and outcome privately.

Do not declare the release gate complete until at least one restore has been
successfully exercised.

## Local development

```bash
bun install
bun run db:up
bun run db:migrate
bun run db:seed
bun run dev
```

The default local web origin is `http://localhost:5174` and the API listens on
`http://localhost:3003`. PostgreSQL is required; SQLite is not supported.
