# TASKS.md — Coding Agent Task List

> Task revision: 2.0  
> Reviewed: 2026-07-04

## 1. Purpose

This file breaks the reviewed implementation plan into small, reviewable tasks.

Complete in order unless the user explicitly changes priority.

Every task report must include:

```text
Summary
Files changed
Schema/API contract impact
Tests/checks run
Known limitations
Security/privacy considerations
Suggested next task
```

## 2. Global Rules

- Read `AGENTS.md`.
- Do not skip graph schema.
- Do not build a generic bookmark app.
- Keep mobile-first.
- Repositories live in `packages/db`.
- Services own transactions.
- Hosted private data is owner-scoped.
- Private is default.
- Do not store raw share tokens.
- Do not use `node_tags`; use `tagged_with` graph edges.
- Keep `pg`/`PostgresDialect` driver and pool configuration isolated in `packages/db`. SQLite is deprecated.
- Update contracts when implementation changes them.
- Never claim a test passed unless run.

## 3. Status Legend

```text
[ ] Not started
[~] In progress
[x] Done
[!] Blocked
```

## 4. Foundation

### [ ] T001 — Scaffold Monorepo

Deliverables:

- Bun workspace;
- `apps/web`;
- `apps/api`;
- `packages/shared`;
- `packages/db`;
- base TypeScript config.

Acceptance:

- `bun install`;
- dev web/api commands;
- typecheck/lint/test/build commands.

### [ ] T002 — Pin Reviewed Toolchain

Deliverables:

- install reviewed dependency families from `TECH.md`;
- commit `bun.lock`;
- record actual resolved versions.

Acceptance:

- no accidental prerelease package;
- dependency list documented;
- build passes.

### [ ] T003 — Configure UI Foundation

Deliverables:

- Tailwind CSS;
- shadcn/ui;
- app shell;
- mobile bottom nav;
- quick-add action;
- Sonner/toast;
- accessible layout primitives.

Acceptance:

- Home/Inbox/Library/Search/More navigation;
- mobile viewport verified;
- React 19/Tailwind 4 setup consistent.

### [ ] T004 — Configure Hono API Foundation

Deliverables:

- Hono app;
- `/api/health`;
- error middleware;
- request ID;
- logging;
- body limits;
- timeout;
- dev proxy/CORS.

Acceptance:

- frontend reaches health;
- errors use canonical shape;
- request ID present.

### [ ] T005 — Configure Shared Contracts

Deliverables:

- Zod 4 schemas;
- node/edge constants;
- DTO exports;
- error schemas;
- pagination schemas.

Acceptance:

- web/api import same contracts;
- invalid enum values rejected.

## 5. Database and Graph

### [x] T006 — Add Kysely PostgreSQL Foundation

Deliverables:

- `pg` driver with Kysely `PostgresDialect` and a connection pool;
- DB factory (requires `DATABASE_URL`);
- test DB factory (resets a `tt_test` schema);
- docker-compose Postgres for local dev (`bun run db:up`);
- migration runner;
- DB status command.

Acceptance:

- Bun runtime smoke test;
- `bun run db:up` + `bun run db:migrate` works;
- foreign keys on (PostgreSQL default);
- `tt_test` schema reset tests pass.

SQLite support has been deprecated.

### [ ] T007 — Add Identity and Graph Migration

Deliverables:

- `users`;
- `graph_nodes`;
- `graph_edges`;
- indexes;
- soft-delete fields.

Acceptance:

- migration from empty DB;
- temporary DB tests;
- active edge uniqueness.

### [ ] T008 — Implement Graph Repositories

Deliverables:

- node create/get/update/soft-delete;
- edge create/get/soft-delete;
- related traversal;
- owner scope;
- symmetric canonicalization.

Acceptance:

- valid edge works;
- invalid pair rejected;
- cross-owner rejected;
- deleted rows excluded;
- symmetric duplicate prevented.

### [ ] T009 — Add Core Domain Migration

Deliverables:

- videos;
- topics;
- skills;
- notes;
- drills;
- mistakes;
- tags;
- learning paths/items;
- collections/items;
- Inbox;
- share links;
- optional creators/sources.

Acceptance:

- unique `node_id`;
- no `node_tags`;
- share token hash columns;
- Inbox converted node column;
- migration test passes.

### [ ] T010 — Add ID, Time, and Transaction Helpers

Deliverables:

- prefixed UUIDv7-style IDs;
- UTC ISO helpers;
- transaction-aware repository context.

Acceptance:

- no autoincrement IDs;
- same transaction object can coordinate repositories.

### [ ] T011 — Seed Topics and Skills Idempotently

Deliverables:

- seed command;
- starter topics;
- starter skills;
- seeded user/local principal strategy.

Acceptance:

- running twice creates no duplicates.

## 6. URL Capture and Inbox

### [ ] T012 — Implement URL Extraction

Deliverables:

- explicit URL parser;
- shared-text URL extraction;
- combined payload handling.

Acceptance:

- common valid cases;
- malformed cases;
- bounded input size.

### [ ] T013 — Implement Safe Provider Detection

Deliverables:

- boundary-safe hostname matching;
- YouTube;
- Facebook best effort;
- generic fallback.

Acceptance:

- `youtube.com` works;
- subdomain works;
- `notyoutube.com` rejected as YouTube;
- malicious suffix cases tested.

### [ ] T014 — Implement URL Canonicalization and Identity

Deliverables:

- preserve source URL;
- canonical URL;
- tracking removal;
- provider external ID extraction;
- duplicate identity service.

Acceptance:

- equivalent YouTube variants resolve consistently;
- generic fallback deterministic.

### [ ] T015 — Implement Inbox Repository and Service

Deliverables:

- create/list/get/update/archive/soft-delete;
- owner scoping;
- raw payload size limit.

Acceptance:

- private isolation;
- deleted items excluded.

### [ ] T016 — Implement Inbox API

Deliverables:

- POST/GET/PATCH/DELETE;
- canonical DTOs;
- validation.

Acceptance:

- API contract tests pass.

### [ ] T017 — Implement Manual Add Video Capture

Deliverables:

- Add Video route;
- URL form;
- Save to Inbox;
- Organize Now entry.

Acceptance:

- URL-only capture;
- metadata failure non-blocking;
- mobile usable.

## 7. PWA

### [ ] T018 — Add Manifest and Service Worker

Deliverables:

- manifest;
- icons;
- Vite PWA plugin;
- offline shell;
- prompted update UX.

Acceptance:

- manifest valid;
- app installable where supported;
- private API NetworkOnly;
- private JSON not precached.

### [ ] T019 — Add POST Share Target

Deliverables:

- manifest `share_target`;
- same-origin Hono `POST /share-target` receiver;
- form parser;
- shared `InboxCaptureService` reuse;
- GET compatibility parser for tests if retained;
- `303` redirect flow.

Acceptance:

- title/text/url accepted;
- receiver does not call its own HTTP API;
- hosted mode requires valid user session;
- POST not cached;
- payload not logged.

### [ ] T020 — Implement Quick Save UI

Deliverables:

- receiving state;
- saved state;
- edit URL state;
- retry state;
- Save to Inbox;
- Organize Now.

Acceptance:

- one confirmation valid save;
- no-URL correction;
- manual fallback.

### [x] T020A — Add Keyless YouTube Metadata Enrichment

Deliverables:

- fixed-host YouTube oEmbed client with bounded response and timeout;
- durable Inbox-first title, creator, and thumbnail enrichment;
- metadata transfer to Video and missing-field duplicate backfill;
- Inbox, Library, and Video thumbnail rendering.

Acceptance:

- native and manual YouTube captures show metadata when available;
- provider failure does not block capture;
- user titles are not overwritten;
- untrusted thumbnail URLs are rejected.

### [x] T020B — Harden the Graph Backbone

Deliverables:

- incoming and outgoing relationship traversal;
- centralized table-tennis node/relationship ontology;
- transactional Topic, Skill, Note, and Drill aggregate service;
- required Note-to-parent semantic edge;
- duplicate edge retries return the persisted edge identity.

Acceptance:

- cross-owner relationships are rejected;
- invalid Note relationships roll back node and domain rows;
- domain workflows reject invalid ontology pairs;
- no generic graph relationship editing endpoint is exposed.

## 8. Central Vertical Slice

### [ ] T021 — Implement Video Aggregate Service

Deliverables:

- create video node;
- create video row;
- resolve link targets;
- create edges;
- duplicate policy.

Acceptance:

- one transaction;
- rollback on failure.

### [ ] T022 — Implement Inbox Conversion Service

Deliverables:

- `convertInboxItemToVideo`;
- `converted_node_id` idempotency;
- optional quick note;
- duplicate existing-video behavior.

Acceptance:

- repeat call returns existing conversion;
- forced edge failure rolls back;
- Inbox recoverable after failed transaction.

### [ ] T023 — Implement Inbox UI and Organize Flow

Deliverables:

- list;
- detail;
- organize form;
- archive/delete;
- conversion success routing.

Acceptance:

- mobile flow complete;
- uncertain retry cannot duplicate.

### [ ] T024 — Implement Initial Video Detail

Deliverables:

- video/node data;
- source open;
- status;
- linked topics/skills/tags;
- notes placeholder;
- related placeholder.

Acceptance:

- converted capture visibly usable.

## 9. Core Learning Library

### [ ] T025 — Implement Videos API/UI

Deliverables:

- create/list/detail/update/delete;
- filters;
- soft delete.

Acceptance:

- delete revokes shares when present;
- deleted excluded.

### [ ] T026 — Implement Topics API/UI

Deliverables:

- CRUD;
- hierarchy;
- detail.

Acceptance:

- cycle rejected;
- delete child conflict handled.

### [ ] T027 — Implement Skills API/UI

Deliverables:

- CRUD;
- primary topic;
- status/difficulty;
- detail sections.

Acceptance:

- FK + mirror edge transactionally consistent.

### [ ] T028 — Implement Notes

Deliverables:

- CRUD;
- plain note;
- parent attachment.

Acceptance:

- node + row atomic.

### [ ] T029 — Implement Timestamp Notes

Deliverables:

- parser;
- seconds storage;
- chronological display;
- provider timestamp links.

Acceptance:

- `mm:ss` and `hh:mm:ss`;
- video-parent validation.

### [x] T028A — Implement Knowledge-Node Picture Attachments

Deliverables:

- PostgreSQL `bytea` attachment storage;
- owner-scoped repository and authenticated API;
- JPEG/PNG/WebP signature and 5 MB size validation;
- clipboard paste and file selection UI;
- private, no-store binary retrieval;
- soft-delete removal.

Acceptance:

- picture attaches only to an active owned graph node;
- binary data is absent from list DTOs and logs;
- public share projections do not expose pictures;
- video, skill, and topic contexts support picture paste.

### [ ] T030 — Implement Drills

Deliverables:

- CRUD;
- status;
- links to skills/videos.

Acceptance:

- node + row + links atomic.

Implemented extensions:

- curated starter Drill catalog persisted idempotently;
- description-only private Drill capture from Library with an automatically derived title;
- canonical `drill --practices--> skill` relationships;
- owner-specific Topic, Skill, and Drill pinning;
- pinned-first and Topic/search-gated Skill browsing.

### [ ] T031 — Implement Mistakes

Deliverables:

- CRUD;
- correction;
- common-mistake links.

Acceptance:

- skill relationships valid.

### [ ] T032 — Implement Tags via Graph Edges

Deliverables:

- tag CRUD;
- slug logic;
- `tagged_with` linking.

Acceptance:

- no `node_tags`;
- duplicate active membership prevented.

## 10. Search and Graph Linking

### [ ] T033 — Implement SearchProvider

Deliverables:

- interface;
- SQL LIKE provider;
- wildcard escaping;
- deterministic order.

Acceptance:

- owner scoped;
- deleted excluded;
- pagination capped.

### [ ] T034 — Implement Search API/UI

Deliverables:

- typed results;
- filters;
- mobile filter sheet;
- preserved URL state.

Acceptance:

- required object types searchable.

### [ ] T035 — Implement Link Related Item UI

Deliverables:

- valid relationship choices;
- target search;
- review sentence;
- edge create.

Acceptance:

- invalid pair hidden and rejected server-side.

### [ ] T036 — Implement Related Sections

Deliverables:

- incoming/outgoing traversal;
- typed sections on video/skill/topic/drill.

Acceptance:

- no deleted/private-other-user leakage.

## 11. Sharing

### [ ] T037 — Implement Share Token Service

Deliverables:

- >=256-bit random token;
- hash;
- safe prefix;
- constant-time-safe comparison path where applicable.

Acceptance:

- raw token not persisted.

### [ ] T038 — Implement Share Links API

Deliverables:

- create/list/update expiry/revoke;
- explicit unlisted default.

Acceptance:

- raw token returned only on create;
- revoke idempotent.

### [ ] T039 — Implement ShareProjectionService

Deliverables:

- allowlisted DTOs by node type;
- safe related previews;
- deleted/expired/revoked checks.

Acceptance:

- owner email absent;
- arbitrary private graph absent;
- privacy tests pass.

### [ ] T040 — Implement Shared Public View

Deliverables:

- `/s/:shareToken`;
- read-only layouts;
- unavailable state.

Acceptance:

- no edit controls;
- no private nav.

## 12. Paths and Collections

### [ ] T041 — Implement Learning Paths

Deliverables:

- CRUD;
- ordered items;
- completion;
- mirror edges.

Acceptance:

- contiguous positions;
- atomic reorder;
- accessible reorder controls.

### [ ] T042 — Implement Collections

Deliverables:

- CRUD;
- ordered membership;
- mirror edges.

Acceptance:

- membership consistent.

## 13. Hosted Security

### [x] T043 — Implement Authentication

Deliverables:

- selected auth;
- current-user context;
- local dev principal only in local mode.

Implemented with Supabase passwordless email Auth. Hono validates Supabase access
tokens server-side, provisions the owned `users` record, and maintains a secure
same-origin cookie for installed-PWA share-target submissions.

Acceptance:

- unauthenticated private request fails.

### [x] T044 — Enforce Owner Isolation

Deliverables:

- repository/service scoping;
- cross-owner tests.

Acceptance:

- guessed IDs do not reveal other user's data.

### [ ] T045 — Add CSRF/CORS/Secure Headers

Deliverables:

- strategy matching auth;
- strict CORS;
- CSP/secure headers.

Acceptance:

- security integration tests.

### [ ] T046 — Harden Metadata Fetching

Deliverables:

- scheme allowlist;
- DNS/IP checks;
- redirect revalidation;
- timeouts;
- size limits;
- content-type checks.

Acceptance:

- loopback/private/link-local blocked.

### [ ] T047 — Add Public Endpoint Rate Limits and Log Redaction

Acceptance:

- tokens/bodies not logged;
- share/metadata abuse limited.

## 14. Operations and Release

### [ ] T048 — Add Readiness and Structured Logging

Deliverables:

- `/api/ready`;
- migration version;
- JSON logs;
- request IDs;
- graceful shutdown.

### [ ] T049 — Implement Backup and Restore Procedure

Deliverables:

- PostgreSQL backup (`pg_dump` / managed snapshots);
- retention;
- restore script/runbook.

Acceptance:

- one restore test completed.

### [ ] T050 — Add Export MVP

Deliverables:

- owner data export;
- no secret/token leakage.

Acceptance:

- export documented and tested.

### [ ] T051 — Accessibility and Mobile Audit

Acceptance:

- keyboard;
- focus;
- touch;
- labels;
- non-color status;
- reorder alternatives.

### [ ] T052 — Critical E2E Suite

Flows:

```text
manual capture -> Inbox -> organize -> video
share payload -> Inbox -> quick save
timestamp note -> source timestamp
skill -> linked video/drill
search -> result
share -> public view -> revoke
```

### [ ] T053 — Migration and Seed Acceptance

Acceptance:

- empty DB migration;
- previous schema upgrade fixture;
- seed twice no duplicates.

### [ ] T054 — Final README and Deployment Runbook

Deliverables:

- setup;
- env;
- commands;
- backup;
- restore;
- deploy;
- auth mode.

### [ ] T055 — MVP Release Gate

Acceptance:

- PRD release criteria;
- no P0 defects;
- security/privacy tests;
- build/typecheck/lint/test/E2E;
- backup restore evidence.

## Phase 2A Training

- [x] Define private graph-backed Practice Session authority.
- [x] Add ordered training blocks and per-Skill confidence check-ins.
- [x] Validate optional Drill/Video attachments against Skill graph links.
- [x] Add dated plans, quick sessions, plan copy, and manual past logs.
- [x] Persist start/pause/resume/complete/skip/add-time transitions.
- [x] Enforce one active block and preserve original plan values.
- [x] Add month calendar, multi-session day agenda, live timer, reflection, and
  week/month insights.
- [x] Add graph atomicity, rollback, ownership, timer, manual-log, and insight
  integration coverage.
