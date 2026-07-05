# Table Tennis Learning Library

Mobile-first graph-backed PWA for capturing table-tennis tutorial videos, organizing them by topics and skills, adding notes/drills, and sharing explicit read-only projections.

## Status

This repository implements the reviewed architecture foundation and the central capture/inbox/video vertical slice from `docs/TASKS.md`. It is structured for Bun, React, Hono, Kysely, SQLite, and shared Zod contracts.

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
```

## Important implementation notes

- `packages/db` is the only repository/Kysely location.
- First-class objects use `graph_nodes`; semantic relationships use `graph_edges`.
- Inbox capture is durable before organization.
- Native PWA share capture posts to same-origin `/share-target` and redirects to `/quick-save/:id`.
- Local development injects a seeded user; hosted auth is represented by a principal boundary and must be wired to a real provider before internet exposure.
