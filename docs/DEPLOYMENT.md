# TT Learning Library — Deployment

> Updated: 2026-07-21

This document is the production deployment runbook for TT Learning Library. It
covers the frontend PWA, the Bun API, PostgreSQL, Cloudflare, Supabase Auth, and
the GitHub Actions release process.

## Production architecture

```text
Browser
  |
  +-- https://tt-learning.tourneypilot.com
  |     Netlify
  |       /         PWA (apps/web)
  |       /share-target → API proxy (preserves POST body)
  |
  +-- https://api.tt-learning.tourneypilot.com
        Cloudflare Tunnel
          |
          +-- http://127.0.0.1:3004
                Bun + Hono API (systemd: ttlearn-api)
                  |
                  +-- PostgreSQL on 127.0.0.1:5432
                  |     Application data, graph, and user content
                  |
                  +-- Supabase Auth
                        Login, sessions, Google OAuth, and JWT validation only
```

Supabase is not the application database. The frontend uses the Supabase client
only for Auth, and sends the resulting bearer token to the Bun API. All
application data and commands go through `https://api.tt-learning.tourneypilot.com`
and are stored in PostgreSQL on the VPS. There should be no production
dependency on Supabase Database, RPC, Realtime, or Storage.

## Public endpoints

| Endpoint | Purpose | Origin |
| --- | --- | --- |
| `https://tt-learning.tourneypilot.com/` | PWA | Netlify |
| `https://api.tt-learning.tourneypilot.com/health` | API health check | VPS through Cloudflare Tunnel |
| `https://api.tt-learning.tourneypilot.com/api/ready` | Readiness check | VPS through Cloudflare Tunnel |
| `vps.tt-learning.tourneypilot.com` | SSH through Cloudflare Tunnel | VPS SSH on port 22 |

## Hetzner VPS

| Setting | Value |
| --- | --- |
| Provider | Hetzner Cloud |
| Console | `https://console.hetzner.com` |
| Operating system | Ubuntu 26.04 LTS, x86_64 |
| CPU | 2 vCPU |
| Memory | 4 GiB |
| Root filesystem | 40 GiB |
| Application directory | `/opt/tt-learning-library` |
| Runtime user | `ttlearn:ttlearn` |

### Services

The three production services are managed by systemd:

```bash
systemctl status ttlearn-api cloudflared postgresql
journalctl -u ttlearn-api -n 100 --no-pager
journalctl -u cloudflared -n 100 --no-pager
```

The API unit is versioned at
[`infra/systemd/ttlearn-api.service`](infra/systemd/ttlearn-api.service) and
installed as `/etc/systemd/system/ttlearn-api.service`.

The deployed API has:

- working directory: `/opt/tt-learning-library`
- process: `/usr/local/bin/bun apps/api/src/index.ts`
- bind address: `127.0.0.1:3004`
- environment file: `/etc/ttlearn/api.env`
- restart policy: restart on failure after three seconds

PostgreSQL listens only on `127.0.0.1:5432` and `::1:5432`. The production
database is `tt_learning`. It is not exposed to the public internet.

### API environment

`/etc/ttlearn/api.env` must be readable only by the appropriate administrator
and service account. It contains:

```dotenv
DATABASE_URL=postgresql://ttlearn_app:<password>@127.0.0.1:5432/tt_learning
HOST=127.0.0.1
PORT=3004
SUPABASE_URL=<supabase-project-url>
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
WEB_ORIGIN=https://tt-learning.tourneypilot.com
PUBLIC_APP_ORIGIN=https://tt-learning.tourneypilot.com
HOSTED_AUTH_REQUIRED=true
AUTO_MIGRATE=false
AUTH_COOKIE_SECRET=<random-secret>
```

The service-role key is used only to validate Supabase access tokens through
Supabase Auth. It must never be included in a frontend build.

### SSH access

The normal operator path uses the Cloudflare Tunnel:

```sshconfig
Host tt-learn vps.tt-learning.tourneypilot.com
    HostName vps.tt-learning.tourneypilot.com
    User root
    IdentityFile ~/.ssh/tt-learn-rescue
    IdentitiesOnly yes
    ProxyCommand /opt/homebrew/bin/cloudflared access ssh --hostname %h
    StrictHostKeyChecking accept-new
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

Connect with:

```bash
ssh tt-learn
```

GitHub Actions connects directly with `VPS_HOST`, `VPS_USER`, and
`VPS_SSH_KEY`. Keep direct port 22 restricted by the Hetzner firewall wherever
possible. The Hetzner root password and rescue SSH key are recovery credentials,
not normal application configuration.

## Cloudflare

A named Cloudflare tunnel connects the VPS to the public internet. The VPS runs
`cloudflared` as a systemd service:

```text
/usr/bin/cloudflared --no-autoupdate tunnel run \
  --token-file /etc/cloudflared/ttlearn-token
```

The token file must not be committed or printed. The expected public-hostname
routes are:

| Public hostname | Tunnel origin |
| --- | --- |
| `api.tt-learning.tourneypilot.com` | `http://127.0.0.1:3004` |
| `vps.tt-learning.tourneypilot.com` | `ssh://localhost:22` |

Cloudflare terminates public HTTPS for the API and sends the request through the
outbound tunnel connection to the local Bun listener. No inbound API port needs
to be opened on the VPS. The API process intentionally binds only to loopback.

Useful checks:

```bash
curl --fail https://api.tt-learning.tourneypilot.com/health
ssh tt-learn 'systemctl is-active cloudflared ttlearn-api'
ssh tt-learn 'ss -lntp'
```

## Netlify frontend

Netlify serves the PWA built from `apps/web`. The build is handled by
[`.github/workflows/build.yml`](.github/workflows/build.yml).

[`netlify.toml`](netlify.toml) provides:

- `/share-target` proxy to the API (preserves POST body for native share capture)
- SPA fallback for `/*` → `/index.html`
- Immutable caching for hashed assets
- No-cache headers for service worker and manifest
- Security headers

All other API calls go directly from the browser to
`https://api.tt-learning.tourneypilot.com` via CORS (configured through
`VITE_API_BASE_URL`).

The production frontend build receives:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_API_BASE_URL=https://api.tt-learning.tourneypilot.com
```

`VITE_SUPABASE_PUBLISHABLE_KEY` contains the Supabase publishable key. It is
safe to embed in the browser, subject to normal Supabase Auth policy. Never
expose `SUPABASE_SERVICE_ROLE_KEY`.

Pull requests produce Netlify preview deployments and add the preview link to
the pull request. A push to `main` produces the production deployment.

## Supabase Auth

Production Auth uses a dedicated Supabase project:

| Setting | Value |
| --- | --- |
| Project name | `tt-learning-library` |
| Site URL | `https://tt-learning.tourneypilot.com` |
| Google provider | Enabled |

Allowed redirect URLs:

```text
https://tt-learning.tourneypilot.com/**
http://localhost:5174/**
```

The Google OAuth web client must be configured with:

```text
Authorized JavaScript origin:
https://tt-learning.tourneypilot.com

Authorized redirect URI:
https://<project-ref>.supabase.co/auth/v1/callback
```

The application supplies `https://tt-learning.tourneypilot.com/library` as the
post-auth redirect. Supabase must allow that URL, while Google must use
Supabase's `/auth/v1/callback` URL. These are two different hops in the OAuth
flow.

## PostgreSQL and migrations

The application database runs on the VPS PostgreSQL instance—not on Supabase.
Schema and migrations are managed by Kysely in the `@ttll/db` workspace package:

- `packages/db/src/schema/database.ts` — the typed `Database` description.
- `packages/db/src/migrations/` — numbered incremental migrations.
- `packages/db/src/migrations/run.ts` — the Kysely migration CLI.

[`scripts/migrate-vps-postgres.sh`](scripts/migrate-vps-postgres.sh):

1. runs the Kysely migrator (`bun packages/db/src/migrations/run.ts`) which
   applies pending migrations inside a PostgreSQL advisory lock;
2. grants privileges to the restricted `ttlearn_app` application role
   ([`infra/postgres/9999_application_grants.sql`](infra/postgres/9999_application_grants.sql)).

The deploy workflow runs the migrator as the PostgreSQL operating-system user:

```bash
sudo -u postgres env DATABASE_URL=postgresql:///tt_learning?host=/var/run/postgresql \
  ./scripts/migrate-vps-postgres.sh
```

Migrations must be backward-compatible with the API version being replaced.
The workflow migrates before restarting `ttlearn-api`; a migration failure stops
the deployment before the restart.

## GitHub Actions

### Frontend: Build and Deploy

Workflow: [`.github/workflows/build.yml`](.github/workflows/build.yml)

Triggers:

- pull requests targeting `main`;
- pushes to `main`.

Builds the PWA with Vite and deploys to Netlify. Pull requests receive preview
deployments.

### Backend: Deploy API and Database to VPS

Workflow:
[`.github/workflows/vps-deploy.yml`](.github/workflows/vps-deploy.yml)

Triggers:

- relevant API, infrastructure, migration, or shared package changes pushed to
  `main`;
- manual `workflow_dispatch`.

The production job:

1. installs dependencies;
2. typechecks and tests;
3. configures SSH;
4. uses `rsync --delete` to update `/opt/tt-learning-library`;
5. installs production workspace dependencies on the VPS;
6. applies PostgreSQL migrations;
7. restarts `ttlearn-api`;
8. checks the systemd service;
9. verifies `https://api.tt-learning.tourneypilot.com/health`.

The job uses the protected GitHub environment `production`, with deployments
serialized by the `vps-production` concurrency group.

### Quality (CI)

Workflow: [`.github/workflows/quality.yml`](.github/workflows/quality.yml)

Runs on every PR and push to `main`: typecheck, lint, tests, migration, build,
PWA verification, and mobile UI screenshots. Does not deploy.

## GitHub Actions secrets

The repository requires the following secret names. Values must be rotated in
GitHub without being committed.

| Secret | Used for |
| --- | --- |
| `NETLIFY_AUTH_TOKEN` | Authenticate Netlify deployment |
| `NETLIFY_SITE_ID` | Select the TT Learning Library Netlify site |
| `VITE_SUPABASE_URL` | Browser Supabase Auth endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Auth administration/validation |
| `VPS_HOST` | Deployment SSH host |
| `VPS_USER` | Deployment SSH user |
| `VPS_SSH_KEY` | Deployment private key |
| `AUTH_COOKIE_SECRET` | Cookie signing secret |

## Google Cloud Secret Manager

The source-of-truth copies of operational credentials are in Google Cloud Secret
Manager project `wudong-agent-master`. Relevant secret IDs are:

```text
ttlearn-database-url
ttlearn-supabase-service-role-key
ttlearn-supabase-url
ttlearn-supabase-publishable-key
ttlearn-cloudflare-tunnel-token
ttlearn-hetzner-ssh-private-key
ttlearn-hetzner-root-password
ttlearn-auth-cookie-secret
```

Retrieve a secret only when needed:

```bash
gcloud secrets versions access latest \
  --project=wudong-agent-master \
  --secret=<secret-id>
```

Do not paste retrieved values into issues, pull requests, logs, shell history,
or this document. Add a new Secret Manager version when rotating a credential,
then update the corresponding GitHub secret and/or `/etc/ttlearn/api.env`.

## Release procedure

1. Develop on a branch and add or update tests.
2. Run the required regression command:

   ```bash
   bun test
   ```

3. Open a pull request and wait for `Build and Deploy Frontend` and `Quality` to
   pass.
4. Merge to `main`.
5. Watch the relevant production workflow:

   ```bash
   gh run list --limit 10
   gh run watch <run-id> --exit-status
   ```

6. Verify production:

   ```bash
   curl --fail https://api.tt-learning.tourneypilot.com/health
   curl --fail https://api.tt-learning.tourneypilot.com/api/ready
   curl --fail --head https://tt-learning.tourneypilot.com/
   ```

7. For an Auth change, verify that Google OAuth starts on the correct Supabase
   project and that the application redirect is
   `https://tt-learning.tourneypilot.com/library`.

## Troubleshooting

### API returns 502 or is unavailable

```bash
ssh tt-learn
systemctl status ttlearn-api cloudflared
journalctl -u ttlearn-api -n 200 --no-pager
curl --fail http://127.0.0.1:3004/health
```

If the local health check works but the public check fails, inspect
`cloudflared`. If both fail, inspect `ttlearn-api` and `/etc/ttlearn/api.env`.

### Database errors

```bash
ssh tt-learn
systemctl status postgresql
sudo -u postgres psql -d tt_learning \
  -c 'select id, name, applied_at from schema_migrations order by applied_at desc;'
```

Do not expose PostgreSQL publicly as a workaround. Use SSH local-forwarding for
administration.

### OAuth reports an unsupported provider

Confirm Google is enabled in the dedicated `tt-learning-library` Supabase
project and confirm the client ID and secret are present there.

### Rollback

Frontend rollback is performed from Netlify by publishing a previously known
good deploy. Backend rollback should use a revert commit on `main`, allowing the
same GitHub Actions workflow to deploy it. Database migrations are forward-only;
write and review an explicit corrective migration instead of editing
`schema_migrations` or manually reversing production SQL.

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
