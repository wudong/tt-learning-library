# REVISION_NOTES.md — Architecture Review Applied

> Review date: 2026-07-04

This package contains revised versions of all nine supplied project documents.

## Updated Files

- `AGENTS.md`
- `API_CONTRACT.md`
- `DATA_MODEL.md`
- `IMPLEMENTATION_PLAN.md`
- `PRODUCT_DESIGN.md`
- `TASKS.md`
- `UX_FLOWS.md`
- `PRD.md`
- `TECH.md`

## Major Issues Resolved

1. **Graph architecture drift**
   - Removed the legacy `video_skills`, `video_tags`, `skill_relationships`, and similar competing relational architecture from `TECH.md`.
   - Made `graph_nodes` and `graph_edges` the canonical backbone.
   - Kept domain tables for object-specific fields.

2. **Data source-of-truth ambiguity**
   - Defined authority for domain statuses, node metadata, semantic edges, primary topic relationships, note parents, tags, paths, and collections.
   - Removed `node_tags` from the MVP design; tag membership uses `tagged_with` edges.
   - Added atomic mirror rules where specialized ordered/stateful membership is needed.

3. **Kysely/SQLite driver ambiguity**
   - Selected Bun's native `bun:sqlite` through a local adapter for Kysely's built-in SQLite statement contract.
   - Kept runtime-specific database APIs isolated in `packages/db`.
   - Added a Bun runtime smoke-test requirement.

4. **Native PWA share capture**
   - Made native share capture consistently MVP.
   - Preferred POST `application/x-www-form-urlencoded`.
   - Corrected the architecture so same-origin Hono receives `POST /share-target`; a client-only Vite route is not relied upon for navigation POST.
   - Receiver reuses `InboxCaptureService` and returns `303` to Quick Save.
   - Manual paste remains fallback.

5. **Inbox conversion correctness**
   - Added `converted_node_id`.
   - Defined idempotent retry behavior.
   - Defined one transaction for graph node, video row, edges, optional note, and Inbox state.

6. **Sharing/privacy**
   - Made basic explicit unlisted sharing consistently MVP.
   - Added `ShareProjectionService`.
   - Store SHA-256 token digest and safe prefix, not raw token.
   - Added expiry, revocation, deleted-target behavior, and public projection privacy tests.

7. **Soft deletion**
   - Standardized `deleted_at`.
   - Defined atomic domain/node/edge deletion behavior.
   - Active shares are revoked for deleted targets.

8. **URL correctness and deduplication**
   - Replaced unsafe substring hostname checks with boundary-safe matching.
   - Added canonical URLs and provider external IDs.
   - Defined owner-scoped duplicate identity.

9. **Authentication/deployment**
   - Separated local/private mode from hosted MVP mode.
   - Hosted private data requires authentication and owner isolation.
   - No public no-auth private-data API.

10. **API drift**
    - Made `API_CONTRACT.md` the canonical endpoint/DTO contract.
    - Added readiness, mistakes, tags, sharing, paths, collections, idempotency, caching, and soft-delete semantics.
    - Removed generic graph status duplication.

11. **PWA caching**
    - Private APIs are `NetworkOnly`.
    - Private JSON is never precached.
    - Share-target POST is never cached.
    - Prompted service-worker update is preferred for form safety.

12. **Security**
    - Added remote-fetch SSRF controls.
    - Added request limits, timeouts, CORS/CSRF rules, secure headers, rate limiting, token/log redaction, and owner isolation.

13. **Operations**
    - Added `/api/ready`, request IDs, structured logs, graceful shutdown, migration state, SQLite-safe backup/restore targets, RPO/RTO, and restore testing.

14. **Testing**
    - Added mandatory transaction rollback, conversion idempotency, owner isolation, soft-delete, URL-hostname, share projection, expiry/revocation, migration, and seed tests.

15. **Current technology baseline**
    - Added a reviewed 2026-07-04 baseline in `TECH.md`.
    - Exact resolved dependencies remain pinned by `bun.lock`.

## Cross-Document Scope Decisions

Resolved consistently across the package:

- Native PWA share capture: **MVP**
- Manual paste fallback: **MVP**
- Inbox-first capture: **MVP**
- Basic explicit unlisted read-only sharing: **MVP**
- Community/public-library collaboration: **post-MVP**
- Hosted authentication: **required**
- Learning paths: **late MVP**
- Graph database: **not MVP**
- Complex offline mutation sync: **not MVP**
- Heavy AI: **not MVP**

## Missing Source File

The supplied package did not include `vision.md`. The revised `AGENTS.md` no longer makes that missing file a blocker; it treats `PRD.md` as the canonical product-scope document for this reviewed package.
