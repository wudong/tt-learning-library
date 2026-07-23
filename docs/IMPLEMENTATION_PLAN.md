# IMPLEMENTATION_PLAN.md — Build Plan

> Delivery revision: 2.0  
> Reviewed: 2026-07-04

## 1. Purpose

This file turns the reviewed product, architecture, data model, API contract, and UX flows into an implementation sequence.

Strategy:

> Build a thin real vertical slice around capture and graph-backed storage first, then expand the learning system without breaking privacy or portability.

## 2. Delivery Principles

1. Graph first, UI simple.
2. Capture and Inbox before broad library features.
3. Mobile first.
4. Private by default.
5. Transactional node/domain writes.
6. Kysely repository boundary.
7. PostgreSQL now (SQLite deprecated).
8. Small runnable milestones.
9. No unresolved driver/schema/API ambiguity.
10. Security and restore testing are release work, not post-release work.

## 3. Milestone 0 — Documentation Contract

### Goal

Freeze one coherent implementation contract.

### Deliverables

- reviewed `PRD.md`;
- reviewed `TECH.md`;
- reviewed `DATA_MODEL.md`;
- reviewed `API_CONTRACT.md`;
- reviewed `PRODUCT_DESIGN.md`;
- reviewed `UX_FLOWS.md`;
- reviewed `IMPLEMENTATION_PLAN.md`;
- reviewed `TASKS.md`;
- reviewed `AGENTS.md`.

### Acceptance Criteria

- native share capture is consistently MVP;
- basic explicit unlisted sharing is consistently MVP;
- graph model is consistent;
- `node_tags` is not expected by any implementation task;
- Kysely PostgreSQL driver decision is explicit;
- hosted auth/private rules are consistent;
- repository ownership is unambiguous.

## 4. Milestone 1 — Project Scaffold and Tested Toolchain

### Goal

Create runnable monorepo foundation with pinned dependencies.

### Deliverables

```text
apps/web
apps/api
packages/shared
packages/db
```

Plus:

- Bun workspace;
- TypeScript configs;
- React/Vite app;
- Hono API;
- Tailwind/shadcn setup;
- lint/format;
- Bun tests;
- CI commands;
- environment validation.

### Acceptance Criteria

- `bun install`;
- `bun run dev:web`;
- `bun run dev:api`;
- `bun run typecheck`;
- `bun run lint`;
- `bun test`;
- `bun run build`;
- frontend calls `/api/health`;
- exact versions recorded in `bun.lock`;
- no unsupported package baseline silently substituted.

## 5. Milestone 2 — PostgreSQL/Kysely Foundation

> Note: SQLite support has been deprecated. This milestone is now PostgreSQL-only via the `pg` driver and Kysely `PostgresDialect`. Local development uses the docker-compose Postgres instance (`bun run db:up`).

### Goal

Prove the database stack before domain implementation.

### Deliverables

- `pg` driver with `PostgresDialect` and a connection pool;
- Kysely built-in `PostgresDialect`;
- database factory;
- test database factory (resets a `tt_test` schema);
- migration runner;
- migration status command;
- ID helpers;
- UTC timestamp helpers;
- connection pool / sslmode setup (no PRAGMA/WAL).

### Acceptance Criteria

- Bun runtime smoke test passes;
- `bun run db:up` then `bun run db:migrate` creates DB;
- foreign keys on (PostgreSQL default);
- `tt_test` schema reset tests work;
- driver/pool configuration isolated in `packages/db`.

## 6. Milestone 3 — Identity, Graph Schema, and Invariants

### Goal

Create the graph backbone.

### Deliverables

- `users`;
- `graph_nodes`;
- `graph_edges`;
- node/edge constants;
- Zod validators;
- graph repositories;
- symmetric-edge canonicalization;
- owner scoping;
- soft-delete defaults.

### Acceptance Criteria

- create video/skill/topic node types;
- create valid edge;
- reject invalid edge pair;
- reject cross-owner private edge;
- related-node traversal works;
- symmetric duplicate prevented;
- deleted nodes/edges excluded.

## 7. Milestone 4 — Core Domain and Workflow Schema

### Goal

Add graph-backed learning objects and workflow tables.

### Deliverables

- `videos`;
- `topics`;
- `skills`;
- `notes`;
- `drills`;
- `mistakes`;
- `tags`;
- `learning_paths`;
- `learning_path_items`;
- `collections`;
- `collection_items`;
- optional `creators`;
- optional `sources`;
- `inbox_items`;
- `share_links`.

### Acceptance Criteria

- every graph-backed domain table has unique `node_id`;
- domain status authority matches `DATA_MODEL.md`;
- no `node_tags` table;
- tag membership uses graph edge;
- Inbox has `converted_node_id`;
- share links store token hash, not raw token;
- migration from empty DB passes.

## 8. Milestone 5 — URL Parsing, Canonicalization, and Manual Capture

### Goal

Build safe foundational capture.

### Deliverables

- URL extraction from explicit URL/text;
- boundary-safe provider detection;
- canonicalization;
- YouTube known-provider ID extraction;
- best-effort Facebook/generic handling;
- duplicate identity service;
- manual Add Video screen;
- Inbox create API.

### Acceptance Criteria

- handles direct URL and text URL;
- rejects malformed URL;
- does not misclassify `notyoutube.com`;
- original URL preserved;
- canonical URL stored;
- manual save to Inbox works;
- metadata failure does not block capture.

## 9. Milestone 6 — PWA Installability and Native Share Target

### Goal

Make capture work through supported system share flows.

### Deliverables

- manifest;
- icons;
- `vite-plugin-pwa`;
- offline shell;
- prompted service-worker updates;
- POST share target;
- same-origin Hono `POST /share-target` receiver;
- shared `InboxCaptureService` reuse;
- GET compatibility parser for testing if retained;
- Quick Save screen.

### Acceptance Criteria

- manifest valid;
- app installable where supported;
- share payload accepted by server POST receiver;
- receiver does not loop back through its own HTTP API;
- private API not runtime cached;
- share-target POST not cached;
- one confirmation saves valid capture to Inbox;
- no-URL branch allows correction;
- manual paste still works.

## 10. Milestone 7 — Inbox Conversion Vertical Slice

### Goal

Prove the central transaction.

### Deliverables

- Inbox list/detail;
- organize form;
- conversion service;
- graph/domain/edge transaction;
- optional quick note;
- idempotent retry;
- existing-duplicate behavior.

### Acceptance Criteria

- conversion creates node + video + edges atomically;
- forced edge failure rolls back all writes;
- repeated conversion returns existing conversion;
- raw Inbox item remains recoverable after failure;
- success opens video detail.

This milestone is the architecture proof point. Do not expand broadly before it passes.

## 11. Milestone 8 — Core Library Objects

### Goal

Build useful learning pages.

### Deliverables

- Videos API/UI;
- Topics API/UI;
- Skills API/UI;
- Notes API/UI;
- Timestamp notes;
- Drills API/UI;
- Mistakes API/UI if in active MVP scope;
- tag create/link UI;
- detail related sections.

### Acceptance Criteria

- primary topic mirror consistent;
- timestamp validation works;
- supported timestamps open source;
- drill links graph-backed;
- skill page is a primary surface;
- soft delete works.

## 12. Milestone 9 — Search and Graph Linking

### Goal

Make the library retrievable and connected.

### Deliverables

- `SearchProvider`;
- SQL `LIKE` implementation;
- typed result DTOs;
- filters;
- graph link UI;
- related queries;
- pagination caps.

### Acceptance Criteria

- searches required object types;
- note content searchable;
- owner scoped;
- deleted rows excluded;
- deterministic results;
- invalid relationship pairs rejected.

## 13. Milestone 10 — Explicit Read-Only Sharing

### Goal

Share selected value without exposing the private library.

### Deliverables

- cryptographic token generator;
- token hashing;
- share-link API;
- `ShareProjectionService`;
- public API;
- `/s/:shareToken`;
- revoke UI;
- expiry support.

### Acceptance Criteria

- raw token stored nowhere;
- unlisted default;
- revoked token stops working;
- expired token stops working;
- deleted node stops working;
- public view excludes owner/private unrelated data;
- privacy integration tests pass.

## 14. Milestone 11 — Learning Paths and Collections

### Goal

Add ordered learning sequences and optional bundles.

### Deliverables

- path CRUD;
- path items;
- transactional reorder;
- completion state;
- traversal mirror edge;
- collection CRUD/membership if retained in MVP.

### Acceptance Criteria

- positions contiguous;
- reorder atomic;
- accessible non-drag reorder;
- membership and mirror consistent;
- completion persists.

## 15. Milestone 12 — Hosted Auth and Security Hardening

### Goal

Make internet-exposed private deployment safe.

### Deliverables

- selected authentication implementation;
- owner-scoped repositories/services;
- secure cookie/CSRF strategy if cookie auth;
- secure headers/CSP;
- CORS policy;
- body limits;
- timeouts;
- public endpoint rate limits;
- metadata SSRF controls;
- secret management;
- log redaction.

### Acceptance Criteria

- cross-owner object access fails without disclosure;
- unauthenticated private request fails;
- CSRF/security strategy tested;
- metadata fetch blocks disallowed destinations;
- Hono dependency is on reviewed patched line.

Local-only deployment may not skip architecture support for ownership.

## 16. Milestone 13 — Operations, Backup, and MVP Hardening

### Goal

Prepare for production.

### Deliverables

- `/api/ready`;
- request IDs;
- structured production logs;
- graceful shutdown;
- migration status;
- backup procedure;
- restore procedure;
- export if retained;
- accessibility pass;
- mobile pass;
- critical E2E suite.

### Acceptance Criteria

- nightly backup configured for hosted environment;
- one restore test completed;
- empty DB migration passes;
- upgrade migration test passes;
- critical mobile flows pass;
- no unresolved P0 issues;
- release criteria in `PRD.md` pass.

## 16A. Phase 2A — Training Planner and Tracking

1. Reconcile PRD, data model, API, technical, product-design, and UX contracts.
2. Promote `practice_session` into the supported graph vocabulary.
3. Add private Session, ordered Block, and Skill Check-in tables plus migration
   and owner-scoped repositories.
4. Implement transactional plan/manual creation, attachment validation, graph
   mirrors, copy, remaining-block edits, persisted timer transitions, completion,
   deletion, calendar ranges, and insights.
5. Add the Training bottom-navigation destination, month calendar, planner,
   active timer, reflection, manual logging, and insights.
6. Verify empty migration, rollback, ownership, timer exclusivity, elapsed-time
   persistence, manual-log accounting, mobile reflow, accessibility, and build.

## 17. Dependency Upgrade Policy

Before changing reviewed baseline:

1. read official migration/release notes;
2. update lockfile;
3. run typecheck;
4. run unit/integration tests;
5. run build;
6. run critical E2E;
7. record breaking changes.

Security patches can be fast-tracked but cannot skip validation entirely.

## 18. Later Roadmap — Do Not Build Early

- collaboration;
- community;
- public libraries;
- AI summaries;
- transcripts;
- embeddings;
- vector search;
- graph visualization;
- complex offline sync;
- native apps;
- payments.
