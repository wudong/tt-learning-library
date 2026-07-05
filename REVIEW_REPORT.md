# Implementation Review — Table Tennis Learning Library (vs. `docs/` spec)

> Review date: 2026-07-05
> Reviewer: coding agent
> Scope: `apps/`, `packages/`, `tests/`, `scripts/`, root tooling vs. the canonical
> documents in `docs/` (`PRD`, `TECH`, `DATA_MODEL`, `API_CONTRACT`, `PRODUCT_DESIGN`,
> `UX_FLOWS`, `IMPLEMENTATION_PLAN`, `TASKS`, `AGENTS`).

## 0. Executive summary

The repository contains a thin but real vertical slice: Hono API, Kysely/SQLite
graph-backed schema, Inbox capture, inbox→video conversion, search, share-link
creation, PWA manifest with share-target, and a small React UI. The architecture
direction is broadly aligned with the spec.

However, **the project is not at MVP release quality and several quality gates fail
today**:

1. **Quality gates do not pass.** `bun run typecheck`, `bun run build`, and `bun test`
   all fail. Workspace packages `@ttll/shared` and `@ttll/db` are **not linked into
   `node_modules`** (`node_modules/@ttll` is missing), so module resolution fails.
2. **The central MVP transaction is broken at runtime.** `convertInboxItemToVideo`
   opens a Kysely transaction and then calls `VideoAggregateService.createVideo`,
   which itself calls `this.db.transaction().execute(...)`. Kysely throws
   "calling the transaction method for a Transaction is not supported" → the
   milestone-7 proof point fails.
3. **Schema drift from `DATA_MODEL.md`** in `tags`, `learning_path_items`,
   `share_links`, `learning_paths`, plus missing indexes/unique constraints.
4. **API surface is far smaller than `API_CONTRACT.md`.** Most endpoint families
   (`/api/topics`, `/api/skills`, `/api/notes`, `/api/drills`, `/api/mistakes`,
   `/api/tags`, `/api/graph`, `/api/learning-paths`, `/api/collections`) are missing
   or only partially implemented under `/api/library`. Video detail returns empty
   `topics/skills/tags/notes/drills/learningPaths` arrays — relationships are not
   actually projected despite being graph-backed.
5. **Frontend is skeletal.** Only Home, Inbox, Library, Search, Settings, AddVideo,
   OrganizeInbox, and VideoDetail exist. No skill/topic/drill/note/mistake/path
   pages, no shared view, no sign-in/session-recovery, no notes/timestamp-notes UI,
   no share UI, no related-link UI. Many buttons are non-functional.
6. **Sharing projection is not spec-safe.** `getPublicProjection` returns the raw
   node DTO generically instead of a per-type allowlisted projection with safe
   related previews — a privacy invariant violation.
7. **Tests are minimal and failing.** Only 2 unit/integration tests, no E2E (just a
   README), and the mandatory invariant test list from `AGENTS.md §8` is largely
   absent.

The slice is a good foundation, but the MVP Definition of Done (`AGENTS.md §10`) is
not met.

---

## 1. Quality-gate status (actually run)

| Gate | Command | Result |
|---|---|---|
| typecheck | `bun run typecheck` | ❌ Fails (TS6059 rootDir + TS2339/2345) |
| build | `bun run build` | ❌ Fails (same TS errors in `packages/db`) |
| test | `bun test` | ❌ 0 pass, 2 fail, 1 unhandled error |
| test:integration | `bun test tests/integration` | ❌ Fails (nested-transaction bug) |
| test:e2e | `bun test tests/e2e` | ⚠️ Trivially passes — directory only has a README |
| lint | `bun run lint` | ⚠️ Implemented as `tsc --noEmit` (not a real linter) |
| db:migrate | `bun run db:migrate` | Not run in this review; migration code exists |
| `node_modules/@ttll/*` | `ls node_modules/@ttll` | ❌ Missing — workspace not linked |

### 1.1 Root causes of failure

- **Workspace not installed/linked.** `package.json` declares
  `"workspaces": ["apps/*","packages/*"]` and `bun.lock` exists, but
  `node_modules/@ttll/shared` and `node_modules/@ttll/db` are absent. Until
  `bun install` is run (and resolves), `@ttll/db` cannot be imported from `tests/`
  (`Cannot find module '@ttll/db'`).
- **`packages/db/tsconfig.json` sets `rootDir: "src"` while importing
  `@ttll/shared` source.** TS correctly errors TS6059 because the shared sources
  are outside `rootDir`. The tsconfig `paths` alias points at `packages/shared/src`,
  which conflicts with `rootDir`.
- **Nested Kysely transaction.** `VideoAggregateService.convertInboxItemToVideo`
  calls `new VideoAggregateService(trx).createVideo(...)`, and `createVideo`
  unconditionally opens `this.db.transaction().execute(...)`. Inside an existing
  transaction `trx` is a `Transaction`, not a `Kysely`, and `Transaction.transaction`
  throws. The single integration test demonstrates this.

---

## 2. Schema review vs. `DATA_MODEL.md`

`packages/db/src/migrations/001_initial.ts` and `schema/database.ts`.

### 2.1 Deviations / bugs

| Table | Spec | Implementation | Severity |
|---|---|---|---|
| `tags` | `name, slug, tag_type`; unique active `(user_id, slug)` | has `name, color`; **no `slug`, no `tag_type`**; no unique constraint | **High** — `slug` is part of canonical tag identity (§7.7, §9) |
| `learning_path_items` | `learning_path_id, node_id, position, note, is_completed, completed_at`; unique active `(learning_path_id, node_id)` and `(learning_path_id, position)` | uses `path_id`, `item_node_id`; **missing `note`, `is_completed`, `completed_at`**; no unique constraints | **High** — path completion/ordering invariants unenforceable (§7.9) |
| `learning_paths.status` | default `'draft'`; set `draft/active/completed/archived` | default `'active'` | Medium — wrong default/state set |
| `share_links` | column `node_id`; indexes `(user_id, node_id, revoked_at, deleted_at)` and `(token_prefix)` | column `target_node_id`; index `(user_id, target_node_id, deleted_at)` only — **missing `revoked_at` and `token_prefix` index** | Medium — admin lookup/correlation less efficient; naming diverges from contract |
| `videos` | `DATA_MODEL.md` lists a single `status` enum (saved/watching/practicing/revisit/understood) | split into `progress` + `learning_state` | **Doc conflict** (see §2.2) |
| `users` | unique `lower(email)` partial index | not created | Low |
| `graph_nodes` | index `(updated_at)` | not created | Low |
| `creators`, `sources` | optional normalized tables | not created | OK (optional) |

### 2.2 Doc conflict: video status vs. progress/learning-state

`DATA_MODEL.md §7.1` (revision 2.0) still defines a single `videos.status` enum with
six values. `PRD.md §8.8` and `TECH.md` (revision 2.1) require **two separate
dimensions** (`progress` and `learning_state`). The implementation follows the 2.1
split. Per `AGENTS.md §2` precedence, `DATA_MODEL.md` outranks `TECH/PRD`, so this is
a real conflict that must be resolved by a documented fix to `DATA_MODEL.md`, not by
silently choosing. Recommended: update `DATA_MODEL.md §7.1` to the two-field model.

### 2.3 What is correct

- `graph_nodes` / `graph_edges` backbone, active-edge partial unique index, owner
  scoping, soft-delete columns, WAL/foreign_keys/busy_timeout pragmas, UTC ISO
  timestamps, text prefixed IDs (`createId`), `inbox_items.converted_node_id`
  idempotency column, `share_links` stores only `token_hash` + `token_prefix`.
- Tag membership via `tagged_with` edge (no `node_tags` table). ✅
- One-to-one `unique(node_id)` on domain tables. ✅

---

## 3. API review vs. `API_CONTRACT.md`

### 3.1 Missing / partial endpoint families

| Contract family | Status |
|---|---|
| `GET /api/health`, `GET /api/ready` | Present, but `/api/ready` is hardcoded — does not check DB connectivity or return 503 when not ready, and `migrationVersion` is a constant, not derived. |
| `POST/GET/PATCH/DELETE /api/inbox`, `POST /api/inbox/:id/convert-to-video` | Present. PATCH does not re-canonicalize `sourceUrl`. GET list `total` is unfiltered by status. |
| `POST/GET/GET/:id/PATCH/DELETE /api/videos` | Present. `GET /:id` returns empty `topics/skills/tags/notes/drills/learningPaths` arrays — **not graph-projected**. `related` is populated. |
| `/api/topics` (list/detail/CRUD/hierarchy) | ❌ Only `GET /api/library/topics` and `POST /api/library/topics` exist. No `GET /:id`, `PATCH`, `DELETE`, cycle-safe parent checks. |
| `/api/skills` | ❌ Only list + create under `/api/library/skills`. No detail, patch, delete, primary-topic mirror update. |
| `/api/notes` | ❌ Only `POST /api/library/notes`. No list/detail/patch/delete. Timestamp-note validation (video parent, `note_type='timestamp'` requires seconds) not enforced server-side. |
| `/api/drills` | ❌ Only `POST /api/library/drills`. No list/detail/patch/delete; drill fields (instructions/duration/repetition/status) not accepted. |
| `/api/mistakes` | ❌ Not implemented at all. |
| `/api/tags` | ❌ Not implemented (tags table exists; no API to create/list/attach). |
| `/api/graph/*` (edges CRUD, related traversal, node lookup) | ❌ Not implemented as a public API. |
| `/api/search` | Present but incomplete — see §3.3. |
| `/api/share-links` (create, list, patch, revoke) | Partial — only `POST` and `DELETE /:id`. **Missing `GET` list and `PATCH` expiry.** Revocation uses `DELETE` instead of the contract's `POST /api/share-links/:id/revoke`. |
| `GET /api/public/share/:shareToken` | Present but projection unsafe — see §3.4. |
| `/api/learning-paths` + items | ❌ Not implemented (table exists only). |
| `/api/collections` + items | ❌ Not implemented (post-MVP, but contract still lists it). |

### 3.2 Routing mount deviation

Topics, skills, notes, drills are mounted under `/api/library/*` rather than the
canonical top-level families `/api/topics`, `/api/skills`, etc. This is an
undocumented contract divergence.

### 3.3 Search gaps (`SearchRepository`)

- Searches only `video`, `skill`, `topic`, `note`. **Missing `drills.title/
  description`, `tags.name`, `mistakes`** — `DATA_MODEL.md §12` and `API_CONTRACT
  §17` require drills and tags.
- `SearchQuerySchema.type` enum includes `drill` and `tag`, but the repository has no
  branches for them → silent empty results.
- Wildcard characters in `q` are **not escaped** (`%` / `_` are user-controlled).
  `TECH.md §12` and `API_CONTRACT §17` require wildcard-safe handling.
- `total` is `data.length` (post-slice), not a real count; pagination/cap semantics
  are inconsistent with the list contract.
- No deterministic secondary ordering.

### 3.4 Share projection — privacy invariant violation

`ShareService.getPublicProjection` returns:

```ts
{ nodeType, title, summary, projection: { node: presentNode(node) } }
```

Problems vs. `TECH.md §14.3` and `API_CONTRACT §18`:

- No per-target-type allowlisted DTO; it returns the generic private `GraphNodeDto`
  (including `id`, `visibility`, `createdAt`, `updatedAt`) to public readers.
- No safe related-previews allowlist; `related` is omitted entirely (better than
  leaking, but the contract requires per-type safe previews).
- Deleted-target check relies on `getNode` returning null (OK), but revoked/expired
  throws generic `Error('NOT_FOUND'/'EXPIRED')`; error middleware maps `EXPIRED` to
  `INTERNAL_ERROR` (code not in the recognized set) → wrong status/code. Public
  failure states (invalid/expired/revoked/deleted) are not distinguished per
  `UX_FLOWS.md §15`.
- `share_links.node_id` vs `target_node_id` naming divergence with contract.

### 3.5 Share-target receiver (`/share-target`)

- ✅ Uses same `InboxCaptureService` (does not loop through HTTP API).
- ✅ `303` redirect to `/quick-save/:id`.
- ✅ GET compatibility parser present.
- ❌ Hosted-auth failure path: `principalMiddleware` returns `401 JSON` instead of
  redirecting to a sign-in/recovery flow and preserving bounded continuation context
  (`TECH.md §7.2`, `UX_FLOWS.md §21`). Native share POSTs will not carry
  `x-user-id`, so in hosted mode every native share becomes a 401.
- ⚠️ Form payload size limit is enforced only via Zod string max lengths; no
  total-body-size limit middleware.
- ⚠️ `ShareTargetPayloadSchema.parse` will throw on missing fields → 500-ish mapping;
  malformed payload handling is not explicitly tested.

### 3.6 Cross-cutting backend gaps

- **Error mapping is string-sniffing** (`errors.ts`): maps by `message.includes(...)`.
  Services throw `new Error('NOT_FOUND')`, `new Error('CONFLICT: ...')`, etc. This is
  fragile and leaks messages for `VALIDATION_ERROR` to clients. Should use typed
  service errors / `HTTPException`.
- **No body-size limit middleware** (`TECH.md §8.1`, §16).
- **No rate limits** on public share reads or metadata extraction (`TECH.md §16`).
- **No CSP customization**; `secureHeaders()` defaults only.
- **Auth is a placeholder.** Hosted mode trusts an `x-user-id` header with no real
  authentication, no session, no CSRF protection, no `HttpOnly` cookies. Acceptable
  only as a stub, but `Milestone 12` is unmet.
- **No `Idempotency-Key` support** (optional in contract, but inbox conversion must
  not depend on it — it currently doesn't, good).
- **`/api/ready` doesn't actually verify DB/migration state.**
- **`VideoRepository.list.total` returns `data.length`** (capped by limit), not a
  real count — same pagination issue as search.

---

## 4. Service / repository review

### 4.1 `VideoAggregateService.createVideo` — transactional issues

- Calls `this.db.transaction().execute(...)` — fine when invoked from the route, but
  **broken when invoked from `convertInboxItemToVideo` which is already inside a
  transaction** (nested transaction throw). Refactor so conversion reuses the
  transaction connection rather than re-opening one.
- Topic edges: tries `belongs_to` and `.catch()` falls back to `related_to`. This
  silently downgrades invalid edge pairs (video→topic isn't in `belongs_to`
  allowlist) instead of rejecting or using a correct typed edge. The catch hides
  errors and breaks the "reject invalid pairs" invariant.
- Duplicate branch returns `alreadyExisting: true` and status 200 — matches the
  recommended contract behavior. But the inbox conversion path returns
  `alreadyExisting` only from `createVideo`; `convertInboxItemToVideo` spreads it,
  and the duplicate case does **not** mark the inbox item converted, so retrying
  conversion will keep hitting the duplicate branch forever (the
  `converted_node_id` is never set when the video already existed). This deviates
  from `§8.14` idempotency expectations.

### 4.2 `GraphRepository`

- ✅ Validates node types, edge types, owner visibility of both endpoints, rejects
  self-edges, canonicalizes symmetric edges.
- ⚠️ `onConflict(...).columns([...]).doNothing()` targets the partial unique index.
  SQLite supports this, but the index is created with `where deleted_at is null`; if
  a soft-deleted edge exists, a new insert will succeed (correct). Worth a test.
- ⚠️ `related()` only traverses **outgoing** edges (`e.source_node_id = nodeId`).
  Incoming relationships (e.g., a `video --explains--> skill` viewed from the skill)
  won't appear. The contract's "related" sections on detail pages need both
  directions.
- ⚠️ `metadata_json` is wrapped as `{ value: ... }` — fine, but no schema validation
  of `metadata` content.

### 4.3 Other repositories

- `NoteDrillRepository`: no `createNote` validation of "timestamp note requires video
  parent" / "timestamp_seconds only for video parent" (`DATA_MODEL.md §7.4`).
- `TopicSkillRepository`: no cycle detection on `parent_topic_id`; no
  `belongs_to` edge maintained for topic hierarchy or skill primary topic at the
  repository layer (skill creation in `library.ts` does create the edge, but topic
  creation does not maintain hierarchy mirror edges).
- `ShareRepository.revoke` does not reject re-revocation / reactivation — OK.
- `InboxRepository.markConverted` casts `as any` to set `converted_node_id` — type
  leakage; the patch type doesn't include `converted_node_id`.

### 4.4 Services own transactions? (AGENTS §5.1)

Mostly yes, but `library.ts` route handler performs the skill-creation transaction
inline (`db.transaction().execute(...)` inside the route). `AGENTS.md §5.1` says "No
business workflow in repositories" and services own transactions; route handlers
should be thin. Move these into a service.

---

## 5. Frontend review vs. `PRODUCT_DESIGN.md` / `UX_FLOWS.md`

### 5.1 Missing routes (TECH.md §6.1 canonical set)

Implemented: `/`, `/inbox`, `/inbox/:id`, `/quick-save/:id`, `/library`,
`/videos/new`, `/videos/:id`, `/search`, `/settings`.

Missing: `/sign-in`, `/session-expired`, `/topics`, `/topics/:id`, `/skills`,
`/skills/:id`, `/notes/:id`, `/mistakes/:mistakeId`, `/drills`, `/drills/:id`,
`/paths`, `/paths/:id`, `/s/:shareToken`.

### 5.2 Missing flows / screens

- **Onboarding** (UX §3) — absent.
- **Skill pages** (M9, UX §9) — absent. Skills are listed in Library? Not even
  shown; Library only lists videos.
- **Topic pages** (UX §10) — absent.
- **Drills** (M10, UX §12) — absent.
- **Mistakes** (S3, UX §27) — absent.
- **Notes & timestamp notes** (M7/M8, UX §8) — no UI. `POST /api/library/notes`
  exists but nothing calls it. Video detail "Note/Timestamp" buttons are inert.
- **Link Related Items** (M11, UX §11) — no UI.
- **Share** (M15, UX §14) — no UI; no copy-link, no shared-view page.
- **Learning Paths** (S5, UX §16) — no UI and no API.
- **Search filters / debounce / load-more / context restore** (UX §13) — only a
  bare input + list; no filters, no 250 ms debounce, no pagination, no
  scroll/query restore on back, no result-count announcements.
- **Session recovery** (M18, UX §21) — absent.
- **Discard Capture / Archive / Already-in-library** (UX §4/§6/§33) — buttons
  present but inert; duplicate detection not surfaced in UI.

### 5.3 Mobile interaction contract (TECH §6.5, UX §20)

- `styles.css` sets `min-width: 320px` and `100dvh` — good baseline.
- Bottom navigation exists; safe-area / `env(safe-area-inset-*)` handling and
  44×44 hit-area rules need an explicit audit (not verified here).
- Add Video is a toolbar button + sidebar button; the "floating quick action above
  bottom nav that never covers the last list item" rule is not implemented as
  specified.
- Router is a minimal `pushState`/`popstate` shim with no query-param parsing,
  scroll restoration, or scroll-context preservation (required by UX §13/§35).

### 5.4 State honesty (PRD §4.7)

- `AddVideo` toasts "Saved to Inbox" on success — honest.
- `OrganizeInbox` shows "Saved to Inbox" heading for quick-save — matches UX §4.
- But duplicate (`alreadyExisting`) is not surfaced as "Already in your library" —
  the user is navigated to the video without the canonical copy/actions.

---

## 6. PWA review

- ✅ Manifest has installability metadata + `share_target` (POST, urlencoded,
  `title/text/url`) matching `TECH.md §7.1`.
- ✅ `registerType: 'prompt'` → prompted updates (UX §22.2).
- ✅ Workbox runtime caching: `/api/*` NetworkOnly, `/share-target` POST NetworkOnly,
  navigations NetworkFirst. Matches `TECH.md §7.3`.
- ✅ `PwaProvider` exposes `updateAvailable` / `applyUpdate` and an install prompt.
- ⚠️ Update prompt is **not guarded against unsaved drafts** (UX §22.2 / TECH §6.4
  require disabling "Update now" when meaningful unsaved work exists).
- ⚠️ No offline-unavailable state UI for new private navigation while offline
  (UX §32).
- ⚠️ No explicit install-guidance screen distinguishing "install available /
  unsupported / already installed / dismissed" states beyond Settings copy.

---

## 7. Security & privacy review (`TECH.md §16`, `AGENTS.md §5.7`)

| Requirement | Status |
|---|---|
| Authentication & owner scoping (hosted) | ❌ Placeholder (`x-user-id` header trust) |
| Private-by-default visibility | ✅ Nodes default `private` |
| Explicit share-link creation | ✅ |
| Token hashing, raw token never persisted | ✅ SHA-256 hash; raw returned once |
| Token ≥256 bits entropy | ✅ Two UUIDs concatenated (256 bits hex) |
| Request body limits | ❌ No middleware |
| Request timeout | ✅ `timeout(10000)` |
| Structured request IDs | ✅ `x-request-id` header |
| Secure headers | ✅ `secureHeaders()` (defaults) |
| CSP | ❌ Not customized |
| Strict same-origin CORS | ⚠️ Single origin, `credentials: true`; no explicit allowlist logic |
| CSRF protection (cookie auth) | ❌ Not implemented |
| Output encoding / no unsafe HTML | ✅ React renders text; no `dangerouslySetInnerHTML` seen |
| Remote-fetch SSRF controls | N/A — metadata extraction not implemented (S1 best-effort, deferred) |
| Rate limits (public share, metadata) | ❌ |
| Secret management | ⚠️ `DEV_USER_ID` env default; no secrets in repo observed |
| No sensitive bodies in logs | ✅ No logging framework yet; nothing logged |
| Dependency security review | ⚠️ Hono `^4.12.0` (spec wants reviewed patched release; range ok) |
| Public projection privacy | ❌ Generic node DTO returned publicly (see §3.4) |
| Deleted target unavailable publicly | ✅ Via `getNode` null check |
| Revocation immediate | ✅ `revoked_at` checked in projection |

**Highest-priority privacy fix:** make `ShareProjectionService` produce per-type
allowlisted DTOs with explicit related-preview allowlists, and stop returning the
private `GraphNodeDto` to public readers.

---

## 8. Testing review (`TECH.md §19`, `AGENTS.md §8`)

### 8.1 What exists

- `tests/url.test.ts` — 3 URL assertions (provider detection, canonicalization,
  text extraction). Fails to import `@ttll/db` until workspace is linked.
- `tests/integration/verticalSlice.test.ts` — 1 test for inbox conversion
  idempotency. Fails due to the nested-transaction bug.
- `tests/e2e/README.md` — placeholder only.

### 8.2 Mandatory invariant tests missing (`AGENTS.md §8`)

- graph node + domain row atomic creation
- transaction rollback
- Inbox conversion idempotency (exists, failing)
- owner isolation
- soft-delete exclusion
- share-link revocation/expiry
- public projection privacy
- URL canonicalization + malicious-hostname cases (partial; `notyoutube.com` covered)
- share-target parsing
- migration from empty DB
- seed idempotency
- duplicate conversion retry / exact-duplicate "no second Video"
- cross-owner edge rejection
- unsupported share-target type rejection
- deleted-node share failure
- timestamp note validation
- learning-path reorder transaction

### 8.3 E2E

None of the `TECH.md §19.5` critical mobile flows are automated. The release QA
matrix (320 / 360–390 / 412–430 CSS px, software keyboard, safe-area, portrait +
landscape) is not set up.

---

## 9. Scripts & tooling (`AGENTS.md §7`)

All required root scripts exist: `dev, dev:web, dev:api, build, typecheck, lint,
test, test:integration, test:e2e, db:migrate, db:seed, db:status`, plus a `quality`
aggregate. ✅

Issues:

- `lint` is `tsc --noEmit`, not a real linter (no ESLint/Biome). `AGENTS.md §8`
  expects "lint passes" — a typecheck stand-in is weak.
- `test:e2e` passes vacuously (no test files).
- No CI workflow file observed (`.github/` etc.) — `AGENTS.md §7` asks for a CI
  release quality gate command; `quality` exists but no CI wiring.

---

## 10. Documentation/contract drift to fix

Per `AGENTS.md §2`, fix conflicts in the smallest consistent way and record them.

1. `DATA_MODEL.md §7.1` — update `videos.status` to the two-field
   `progress` + `learning_state` model (resolve the 2.0-vs-2.1 conflict).
2. `DATA_MODEL.md §7.7` vs. implementation — either restore `tags.slug/tag_type` and
   the unique active `(user_id, slug)` constraint, or document the change.
3. `DATA_MODEL.md §7.9` vs. implementation — `learning_path_items` column names and
   `note/is_completed/completed_at` fields must be reconciled.
4. `API_CONTRACT.md §18` — `share-links` revoke method (`POST /:id/revoke` vs.
   implemented `DELETE /:id`) and list/patch endpoints.
5. `API_CONTRACT.md` — `/api/library/*` mount vs. canonical top-level families; pick
   one and update the contract or the code.
6. `share_links.node_id` vs `target_node_id` naming.

---

## 11. Prioritized recommendations

### P0 — blocks MVP and quality gates

1. Run `bun install` so `@ttll/*` workspace packages are linked; verify
   `node_modules/@ttll/{shared,db}` exist.
2. Fix `packages/db/tsconfig.json` `rootDir` issue (e.g. remove `rootDir` or use
   project references / composite) so `typecheck` and `build` pass.
3. Fix the nested-transaction bug in `VideoAggregateService`: refactor
   `createVideo` to accept a connection (`Kysely | Transaction`) and have
   `convertInboxItemToVideo` pass its `trx` in, rather than re-opening a
   transaction. Add the rollback test.
4. Mark the inbox item `converted` (set `converted_node_id`) even when the duplicate
   video already existed, so conversion retry is idempotent per `§8.14`.
5. Implement `ShareProjectionService` with per-type allowlisted DTOs and safe
   related previews; stop returning the generic node DTO publicly. Add the public
   projection privacy test.
6. Fix error mapping: introduce typed service errors / `HTTPException` so
   `EXPIRED`/`CONFLICT`/`NOT_FOUND` map to correct status codes; never leak
   internal messages.

### P1 — core MVP scope gaps

7. Complete the API families: `/api/topics`, `/api/skills`, `/api/notes`,
   `/api/drills`, `/api/mistakes`, `/api/tags`, `/api/graph/*` with detail responses
   that actually project graph relationships (topics/skills/tags/notes/drills/related
   on video detail).
8. Implement notes + timestamp notes end-to-end (validation, chronological order,
   provider timestamp deep-link, unsupported-provider fallback).
9. Implement skill pages (M9) and drill pages (M10) in the UI.
10. Implement share UI: create link with expiry presets, copy link, open shared
    view `/s/:token`, revoke; plus `GET /api/share-links` list and `PATCH` expiry.
11. Implement search filters, 250 ms debounce, wildcard escaping, real `total`,
    drill/tag/mistake fields, load-more, and back-context restore.
12. Surface exact-duplicate "Already in your library → Open Existing" in capture and
    conversion UIs.

### P2 — schema/contract correctness

13. Restore `tags.slug`/`tag_type` + unique active `(user_id, slug)`.
14. Fix `learning_path_items` columns + add `note/is_completed/completed_at` and
    the two unique-active constraints; fix `learning_paths.status` default to
    `draft`.
15. Add missing indexes: `graph_nodes(updated_at)`, `share_links(token_prefix)`,
    `share_links(user_id, target_node_id, revoked_at, deleted_at)`, `users` email
    unique partial.
16. Reconcile `share_links.target_node_id` ↔ contract `node_id`.
17. Move skill/topic creation transactions out of route handlers into services
    (AGENTS §5.1) and maintain hierarchy/`belongs_to` mirror edges.

### P3 — hardening for release

18. Implement real hosted auth (cookies/sessions/CSRF) or explicitly scope and
    document the local-only mode; fix `/share-target` hosted-unauth redirect flow.
19. Add body-size limits, public-share rate limits, CSP, structured JSON logging,
    real `/api/ready` DB check, graceful shutdown.
20. Add the full mandatory invariant test list and an E2E suite with the recorded
    phone matrix; wire CI to `bun run quality`.
21. Add onboarding, session-recovery, offline-unavailable states, prompted-update
    draft guarding.
22. Add a real linter (Biome/ESLint) and replace the `lint = tsc` stand-in.

---

## 12. What is solid and should be preserved

- Graph backbone schema (`graph_nodes`/`graph_edges`, partial unique active index,
  symmetric-edge canonicalization, owner scoping, soft delete).
- `bun:sqlite` adapter isolated in `packages/db` (TECH §4.1) with WAL/FK/busy
  timeout.
- Text prefixed IDs, UTC ISO timestamps, explicit migration runner with status.
- Shared Zod contracts at request boundaries and typed `apiRequest` runtime parsing
  on the client.
- Inbox-first capture flow reusing `InboxCaptureService` for both JSON API and
  `/share-target`.
- PWA manifest + Workbox cache policy matching the NetworkOnly/private rules.
- Prompted SW update registration.
- Token hashing (SHA-256) with raw token returned once.

The foundation is right; the gaps are breadth (most endpoint families and screens),
correctness (the nested-transaction bug, projection privacy, error mapping), and
test coverage. Address P0 first — nothing else can be reliably verified until
typecheck/build/tests are green.