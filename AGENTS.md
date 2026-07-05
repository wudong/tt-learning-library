# AGENTS.md — Coding Agent Instructions

> Architecture revision: 2.0  
> Reviewed: 2026-07-04

## 1. Project Identity

This repository implements **Table Tennis Learning Library**: a mobile-first Progressive Web App for building a table-tennis-specific learning knowledge graph from tutorial videos.

The app is not a generic bookmark manager, playlist, notes app, or generic knowledge base.

Core promise:

> Help table tennis players turn scattered tutorial videos into an organized, annotated, shareable, graph-backed learning library of skills, topics, notes, drills, mistakes, and learning paths.

## 2. Canonical Documents and Precedence

Read these files before implementation:

1. `PRD.md` — product requirements and MVP scope.
2. `TECH.md` — architecture, stack, security, transactions, deployment.
3. `DATA_MODEL.md` — exact graph-backed persistence contract.
4. `API_CONTRACT.md` — frontend/backend HTTP contract.
5. `PRODUCT_DESIGN.md` — mobile-first product design.
6. `UX_FLOWS.md` — exact user flows.
7. `IMPLEMENTATION_PLAN.md` — milestone order.
8. `TASKS.md` — actionable coding tasks.
9. `AGENTS.md` — coding-agent rules.

`vision.md` may be added later as a long-term strategy document. Its absence must not block implementation of this reviewed package.

Conflict precedence:

1. `AGENTS.md` for coding-agent behavior and non-negotiable invariants.
2. `DATA_MODEL.md` for persistent schema and source-of-truth rules.
3. `API_CONTRACT.md` for HTTP behavior and DTOs.
4. `TECH.md` for architecture and technology decisions.
5. `PRD.md` for product scope and requirements.
6. `PRODUCT_DESIGN.md` and `UX_FLOWS.md` for user-facing behavior.
7. `IMPLEMENTATION_PLAN.md` and `TASKS.md` for sequencing.

Never silently implement a conflicting interpretation. Make the smallest consistent documentation fix and record it in the pull request summary.

## 3. Non-Negotiable Product Invariants

1. **Knowledge graph backbone**
   - First-class knowledge objects have a `graph_nodes` row.
   - Meaningful cross-object relationships use typed `graph_edges`.
   - Domain-specific fields remain in domain tables.

2. **Native share capture is MVP**
   - Installed PWA registers a share target.
   - Same-origin Hono `POST /share-target` accepts the configured payload and redirects to Quick Save.
   - Do not rely on a client-only SPA route to receive native POST share payloads.
   - Capture can save to Inbox with one confirmation.
   - Manual URL paste remains the fallback.

3. **Inbox first**
   - Save first, organize later.
   - Never require full classification during capture.

4. **Private by default**
   - Public/unlisted share links require explicit user action.
   - Public views are read-only.
   - Hosted private data requires authentication and owner scoping.

5. **Table-tennis-specific**
   - Prefer skills, topics, drills, mistakes, learning paths, and practice language.
   - Do not dilute the product into a generic knowledge app.

6. **Mobile first**
   - Every core flow works on a phone.

7. **MVP discipline**
   - No heavy AI, collaboration, public community, complex offline sync, graph DB, or microservices unless scope is explicitly changed.

## 4. Required Technology Direction

Use the reviewed baseline in `TECH.md`.

Core stack:

```text
React + TypeScript + Vite
shadcn/ui + Tailwind CSS
TanStack Query
React Hook Form + Zod
installable PWA

Bun + TypeScript
Hono
Kysely
bun:sqlite adapter
SQLite
future PostgreSQL
```

Important driver rule:

> Kysely's built-in `SqliteDialect` uses a small structural adapter around `bun:sqlite` for this MVP. Keep the adapter isolated in `packages/db`.

Exact versions are pinned by `bun.lock`. Upgrade only after typecheck, tests, build, and critical E2E flows pass.

## 5. Architecture Rules

### 5.1 Layering

Required dependency flow:

```text
UI page/component
-> API hook/client
-> Hono route
-> domain service
-> repository
-> Kysely
-> database
```

Rules:

- No SQL or Kysely in React.
- No Kysely in route handlers.
- No business workflow in repositories.
- Services own transactions.
- Repositories live in `packages/db`; do not create a competing repository layer in `apps/api`.

### 5.2 Transactional Graph/Domain Writes

Creating or deleting a first-class knowledge object must update its node, domain row, and required edges atomically.

Mandatory transactional operations include:

- Inbox conversion to video;
- video create/delete;
- skill create with primary topic;
- topic hierarchy mutation;
- note create with parent;
- drill create with links;
- learning-path item reorder;
- share-link create/revoke.

### 5.3 Database Access

- Text IDs, not SQLite autoincrement IDs.
- UTC ISO 8601 timestamps.
- Foreign keys enabled.
- WAL mode for hosted SQLite where applicable.
- Explicit migrations.
- Default repository reads exclude `deleted_at IS NOT NULL`.
- Avoid SQLite-only semantics in application logic.
- Keep JSON minimal and wrapped.

### 5.4 Data Authority

Follow `DATA_MODEL.md`.

In summary:

- domain tables own domain-specific fields and statuses;
- `graph_nodes` owns universal graph identity, title/summary, visibility, lifecycle timestamps;
- `graph_edges` owns semantic cross-object relationships unless an ordered/stateful membership table is explicitly authoritative;
- intentional mirrors are updated in the same transaction.

### 5.5 Validation

Use shared Zod 4 schemas for request boundaries and response parsing where practical.

Never trust:

- client IDs;
- client ownership;
- share target payloads;
- provider metadata;
- remote URLs;
- public share tokens.

### 5.6 Error Handling

Canonical error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Do not leak stack traces, SQL, local paths, tokens, or internal network information.

### 5.7 Sharing and Privacy

- Default visibility is `private`.
- Share creation is explicit.
- Store only a token hash plus safe prefix, not the raw share token.
- Public rendering goes through `ShareProjectionService`.
- Never expose generic private graph traversal through a public endpoint.
- Revocation takes effect immediately.

### 5.8 URL Safety and Identity

- Use boundary-safe hostname checks.
- Preserve `source_url`.
- Write normalized `canonical_url`.
- Extract provider `external_id` when possible.
- Use owner-scoped deduplication.
- Remote metadata fetching must implement SSRF controls.

### 5.9 PWA Caching

- Private `/api/*` is `NetworkOnly`.
- Private JSON is never precached.
- Share-target POST responses are never cached.
- Do not add offline mutation queues in MVP.

## 6. Repository Structure

```text
tt-learning-library/
  apps/
    web/
      src/
        app/
        routes/
        features/
        components/
        lib/api/
        lib/pwa/
      public/
    api/
      src/
        middleware/
        routes/
        services/
        presenters/
        auth/
  packages/
    shared/
      src/
        contracts/
        dto/
        validators/
        constants/
    db/
      src/
        database/
        schema/
        migrations/
        repositories/
        testing/
  docs/
    PRD.md
    TECH.md
    DATA_MODEL.md
    API_CONTRACT.md
    PRODUCT_DESIGN.md
    UX_FLOWS.md
    IMPLEMENTATION_PLAN.md
    TASKS.md
    AGENTS.md
```

## 7. Required Scripts

Root scripts must exist:

```text
bun run dev
bun run dev:web
bun run dev:api
bun run build
bun run typecheck
bun run lint
bun test
bun run test:integration
bun run test:e2e
bun run db:migrate
bun run db:seed
bun run db:status
```

Add a CI command that runs the release quality gate.

## 8. Quality Gates

Before marking a task complete:

```text
typecheck passes
lint passes
relevant unit tests pass
relevant integration tests pass
build passes
migration from empty DB passes when schema changed
docs updated when contract changed
```

Mandatory invariant tests before MVP release:

- graph node + domain row atomic creation;
- transaction rollback;
- Inbox conversion idempotency;
- owner isolation;
- soft-delete exclusion;
- share-link revocation/expiry;
- public projection privacy;
- URL canonicalization and malicious-hostname cases;
- share-target parsing;
- migration from empty DB;
- seed idempotency.

## 9. Implementation Style

- Prefer small, reviewable changes.
- Use explicit names.
- Keep route handlers thin.
- Use service methods named after business operations.
- Avoid speculative abstractions.
- Avoid hidden global mutable state.
- Prefer deterministic query ordering.
- Cap list limits.
- Return stable DTOs, not raw DB rows.
- Record intentional architecture deviations.

## 10. MVP Definition of Done

MVP is done only when:

- app is installable where PWA support allows;
- manual URL capture works;
- native share target capture works where supported;
- Inbox save and organize-later flow works;
- conversion creates graph node + video row + edges atomically;
- topics, skills, notes, timestamp notes, and drills work;
- search works across required objects;
- related items are graph-backed;
- private-by-default visibility is enforced;
- explicit unlisted sharing works;
- public projection does not leak unrelated private data;
- share revocation works;
- critical mobile flows pass E2E;
- backup and restore procedure is documented and tested once.

## 11. MVP Non-Goals

Do not implement without explicit scope change:

- native iOS/Android app;
- graph database;
- complex graph visualization;
- real-time collaboration;
- community feed;
- heavy AI processing;
- vector search;
- complex offline sync;
- payments;
- multi-tenant organization permissions.

## 12. Agent Reporting Format

Every completed task report must include:

```text
Summary
Files changed
Schema/API contract impact
Tests/checks run
Known limitations
Security/privacy considerations
Suggested next task
```

Never claim a test passed unless it was actually run.
