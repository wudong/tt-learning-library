# Release Status

> Updated: 2026-07-24

This document is the concise source of truth for current delivery status. `TASKS.md`
retains the original reviewed implementation order and contains historical unchecked
items that may already have been delivered through later pull requests.

## Implemented

- Bun workspace with React/Vite PWA, Hono API, shared Zod contracts, Kysely, and PostgreSQL.
- Manual URL capture and installed-PWA POST share target with Inbox-first persistence.
- YouTube metadata enrichment with safe fallback behavior.
- Graph-backed Videos, Topics, Skills, Notes, Drills, Pictures, and typed relationships.
- Curated table-tennis ontology with protected starter Topics, Skills, Drills, steps, diagrams, pinning, and visibility preferences.
- Search, contextual related-item views, soft deletion, and owner-scoped data access.
- Supabase passwordless authentication and transactional legacy-owner migration.
- Training calendar, planned and quick sessions, live timer state, reflections, confidence check-ins, and insights.
- Explicit public share links with allowlisted unauthenticated projections and revocation.
- Automated GitHub Actions quality gate, transactional migration locking, and migration-aware readiness.

## Release-hardening work still required

- Configure the production host to run `bun run db:migrate` before deployment and set `AUTO_MIGRATE=false`.
- Protect `main` with the GitHub Actions quality check after the workflow has passed once.
- Complete the full critical browser E2E suite for capture, native sharing, timestamp notes, public sharing, and revocation.
- Complete the accessibility and mobile audit.
- Exercise and record a production backup restore.
- Implement owner export without secrets or share-token material.
- Replace remaining placeholder Video Detail quick actions with complete Note, Timestamp, and Drill flows.

## Post-MVP candidates

- A lightweight graph exploration view, only after core mobile learning flows are proven.
- User-selected video cover/frame capture. YouTube thumbnails and private picture attachments already cover the current MVP.
- Feedback screenshot attachments.

## Release gate

A production MVP should not be declared complete until:

1. GitHub Actions passes on the release commit.
2. Critical browser E2E flows pass.
3. Public-share creation, anonymous rendering, expiry, and revocation are verified against the deployed environment.
4. A database backup is restored successfully into a clean environment.
5. No P0 privacy, authentication, ownership, or migration defects remain.
