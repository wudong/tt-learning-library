# Table Tennis Learning Library

Mobile-first graph-backed PWA for capturing table-tennis tutorial videos, organizing them by topics and skills, turning learning into structured practice, and sharing explicit read-only projections.

## Status

The application is in private-beta shape. It includes:

- durable manual and native PWA share-target capture;
- a curated table-tennis Topic, Skill, and Drill ontology;
- graph-backed videos, notes, pictures, relationships, and safe removal;
- a mobile training planner with session tracking and insights;
- Supabase passwordless authentication with owner isolation;
- explicit public share links that render without authentication.

`docs/TASKS.md` preserves the original reviewed implementation sequence and is not the source of truth for current completion. Use merged pull requests and `docs/RELEASE_STATUS.md` for the current release view.

## Run

```bash
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

Web: `http://localhost:5174`  
API: `http://localhost:3003`

## PWA verification

Run the production installability checks:

```sh
bun run test:pwa
```

The check verifies the generated manifest, standalone metadata, required icons,
service-worker app shell, private API caching policy, and native share-target
POST handling. Install prompts are browser and platform dependent; manual URL
capture remains available when installation or native sharing is unsupported.

## Quality gate

```bash
bun run quality
bun run test:pwa
```

The same checks run in GitHub Actions for pull requests and pushes to `main`.

## Database migrations

Migrations are protected by a PostgreSQL advisory lock and applied transactionally.
Local development auto-migrates by default. For production, prefer running
`bun run db:migrate` as a pre-deploy step and set `AUTO_MIGRATE=false`. The
`/api/ready` endpoint returns `503` while migrations are pending.

## Important implementation notes

- `packages/db` is the only repository/Kysely location.
- First-class objects use `graph_nodes`; semantic relationships use `graph_edges`.
- Inbox capture is durable before organization.
- Native PWA share capture posts to same-origin `/share-target` and redirects to `/quick-save/:id`.
- Public share URLs use `/s/:token`; the public API projection remains allowlisted under `/api/public/share/:token`.
- Hosted authentication uses Supabase access-token verification; local development uses the configured development principal.
