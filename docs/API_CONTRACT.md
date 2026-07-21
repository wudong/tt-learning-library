# API_CONTRACT.md — Backend API Contract

> Architecture revision: 2.0  
> Reviewed: 2026-07-04  
> Status: canonical HTTP contract

## 1. Purpose

This document defines the HTTP contract between the React PWA and the Bun/Hono backend.

The API supports:

- Inbox-first video capture;
- graph-backed videos, topics, skills, notes, drills, mistakes, paths, and collections;
- search and related-node traversal;
- explicit read-only sharing;
- future authenticated multi-user hosting.

## 2. Contract Principles

1. JSON request/response bodies except the browser/PWA share-target receiver.
2. Shared Zod schemas validate request boundaries.
3. Route handlers are thin.
4. Domain services own business rules and transactions.
5. Repositories own Kysely access.
6. Private data is owner-scoped.
7. Default visibility is private.
8. Public share reads use a dedicated safe projection.
9. DELETE means soft delete unless an endpoint explicitly says otherwise.
10. Never return raw database rows as the public contract.

## 3. URL Conventions

Private API:

```text
/api/*
```

Public share frontend:

```text
/s/:shareToken
```

Public share API:

```text
/api/public/share/:shareToken
```

PWA share receiver:

```text
/share-target
```

API versioning:

- no `/v1` prefix for MVP;
- breaking changes require a documented versioning decision before release.

## 4. Authentication

### 4.1 Local Development

A development principal may be injected only in local/private mode.

### 4.2 Hosted MVP

Authentication is required for private endpoints.

Private requests operate as the current authenticated user. Clients do not choose `userId` in write payloads.

Unauthenticated private request:

```http
401
```

Cross-owner object lookup should generally return `404` rather than reveal existence.

Public share endpoint is intentionally unauthenticated.

## 5. Response Conventions

### 5.1 Single Object

```json
{
  "data": {}
}
```

### 5.2 List

```json
{
  "data": [],
  "page": {
    "limit": 50,
    "offset": 0,
    "total": 0
  }
}
```

List rules:

- default `limit=50`;
- maximum `limit=100`;
- `offset >= 0`;
- deterministic ordering.

### 5.3 Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Codes:

```text
VALIDATION_ERROR
NOT_FOUND
UNAUTHORIZED
FORBIDDEN
CONFLICT
UNSUPPORTED_SOURCE
RATE_LIMITED
EXPIRED
INTERNAL_ERROR
```

Never include stack trace, SQL, filesystem paths, cookies, or tokens.

## 6. Common DTOs

### 6.1 Graph Node

```json
{
  "id": "node_123",
  "nodeType": "video",
  "title": "Reverse Pendulum Serve Tutorial",
  "summary": null,
  "visibility": "private",
  "createdAt": "2026-07-04T00:00:00.000Z",
  "updatedAt": "2026-07-04T00:00:00.000Z"
}
```

Domain status is not duplicated here.

### 6.2 Graph Edge

```json
{
  "id": "edge_123",
  "sourceNodeId": "node_video",
  "targetNodeId": "node_skill",
  "edgeType": "explains",
  "label": null,
  "weight": null,
  "position": null,
  "createdAt": "2026-07-04T00:00:00.000Z",
  "updatedAt": "2026-07-04T00:00:00.000Z"
}
```

### 6.3 Video

```json
{
  "id": "video_123",
  "nodeId": "node_123",
  "sourceUrl": "https://www.youtube.com/watch?v=example",
  "canonicalUrl": "https://www.youtube.com/watch?v=example",
  "sourcePlatform": "youtube",
  "externalId": "example",
  "title": "Reverse Pendulum Serve Tutorial",
  "description": null,
  "thumbnailUrl": null,
  "creatorName": null,
  "durationSeconds": null,
  "status": "saved",
  "importance": null,
  "createdAt": "2026-07-04T00:00:00.000Z",
  "updatedAt": "2026-07-04T00:00:00.000Z"
}
```

## 7. Health and Readiness

### GET `/api/health`

Process health.

Response:

```json
{
  "data": {
    "ok": true,
    "service": "tt-learning-library-api"
  }
}
```

### GET `/api/ready`

Checks database connectivity and compatible migration state.

Success:

```json
{
  "data": {
    "ready": true,
    "database": true,
    "migrationVersion": "20260704_001"
  }
}
```

Return `503` when not ready.

## 8. Inbox API

Inbox supports low-friction capture before graph conversion.

### POST `/api/inbox`

Request:

```json
{
  "sourceUrl": "https://www.youtube.com/watch?v=example",
  "sharedTitle": "Reverse Pendulum Serve",
  "sharedText": "Useful video",
  "sourcePlatform": "youtube",
  "rawPayload": {
    "title": "Reverse Pendulum Serve",
    "text": "Useful video",
    "url": "https://www.youtube.com/watch?v=example"
  }
}
```

Rules:

- at least one useful capture field is required;
- raw payload is size limited;
- URL is validated when present;
- URL canonicalization is best effort;
- recognized YouTube captures are enriched after the Inbox row is durably created;
- an incoming title wins over provider metadata;
- capture succeeds even when metadata extraction fails.

Response `201`:

```json
{
  "data": {
    "id": "inbox_123",
    "sourceUrl": "https://www.youtube.com/watch?v=example",
    "canonicalUrl": "https://www.youtube.com/watch?v=example",
    "sharedTitle": "Reverse Pendulum Serve",
    "sharedText": "Useful video",
    "sourcePlatform": "youtube",
    "thumbnailUrl": "https://i.ytimg.com/vi/example/hqdefault.jpg",
    "creatorName": "Table Tennis Coach",
    "status": "new",
    "convertedNodeId": null,
    "createdAt": "2026-07-04T00:00:00.000Z",
    "updatedAt": "2026-07-04T00:00:00.000Z"
  }
}
```

### GET `/api/inbox`

Query:

```text
status=new|saved|organized|archived
limit=
offset=
```

### GET `/api/inbox/:id`

Owner-scoped detail.

### PATCH `/api/inbox/:id`

Request may include:

```json
{
  "sharedTitle": "Updated title",
  "sharedText": "Updated text",
  "sourceUrl": "https://example.com/video",
  "status": "archived"
}
```

Cannot clear or replace `convertedNodeId` through this endpoint.

### DELETE `/api/inbox/:id`

Soft-delete unneeded capture.

### POST `/api/inbox/:id/convert-to-video`

Canonical conversion operation.

Request:

```json
{
  "title": "Reverse Pendulum Serve Tutorial",
  "topicIds": ["topic_serve"],
  "skillIds": ["skill_reverse_pendulum"],
  "tagIds": ["tag_serve", "tag_sidespin"],
  "quickNote": "Focus on contact point",
  "status": "saved"
}
```

Behavior:

- transactional;
- owner-scoped;
- idempotent by `converted_node_id`;
- canonicalizes URL;
- creates graph node;
- creates video row;
- creates validated graph edges;
- creates optional note;
- marks Inbox item organized.

Repeated successful conversion returns the existing conversion, not a duplicate.

Response:

```json
{
  "data": {
    "video": {},
    "node": {},
    "createdEdges": [],
    "createdNote": null,
    "alreadyConverted": false
  }
}
```

Duplicate source identity may return the existing video with a documented `alreadyExisting` flag or `409 CONFLICT`; implementation must pick one behavior and test it. MVP recommendation: return the existing object with `alreadyExisting=true`.

## 9. Videos API

### POST `/api/videos`

Direct/manual creation.

Request:

```json
{
  "sourceUrl": "https://www.youtube.com/watch?v=example",
  "title": "Reverse Pendulum Serve Tutorial",
  "topicIds": ["topic_serve"],
  "skillIds": ["skill_reverse_pendulum"],
  "tagIds": ["tag_serve"],
  "status": "saved"
}
```

Required:

```text
sourceUrl
```

Behavior:

- validate and canonicalize URL;
- detect platform;
- extract external ID where supported;
- enforce owner-scoped duplicate policy;
- create node + domain row + edges atomically.

### GET `/api/videos`

Query:

```text
q=
topicId=
skillId=
tagId=
status=
sourcePlatform=
limit=
offset=
```

### GET `/api/videos/:id`

Response:

```json
{
  "data": {
    "video": {},
    "node": {},
    "topics": [],
    "skills": [],
    "tags": [],
    "notes": [],
    "drills": [],
    "related": [],
    "learningPaths": []
  }
}
```

### PATCH `/api/videos/:id`

Updatable domain fields:

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "practicing",
  "importance": 4
}
```

Relationship edits use explicit graph/link operations or a dedicated replace-relations command; do not overload a simple metadata PATCH with hidden edge replacement.

### DELETE `/api/videos/:id`

Soft-delete video and graph node atomically, tombstone affected active edges, and revoke active share links for the node.

Response:

```json
{
  "data": {
    "deleted": true
  }
}
```

## 10. Topics API

### POST `/api/topics`

```json
{
  "name": "Serve",
  "description": "Serve techniques and strategy",
  "parentTopicId": null
}
```

Creates topic node + topic row atomically. Parent hierarchy mirror edge is maintained.

### GET `/api/topics`

Query:

```text
q=
parentTopicId=
limit=
offset=
```

### GET `/api/topics/:id`

Includes:

```text
topic
node
childTopics
skills
videos
notes
drills
related
```

### PATCH `/api/topics/:id`

Cycle-safe hierarchy updates.

### DELETE `/api/topics/:id`

Soft delete. If active child topics exist, return `409 CONFLICT` unless a future explicit reparent operation is provided.

## 11. Skills API

### POST `/api/skills`

```json
{
  "name": "Reverse Pendulum Serve",
  "description": "Serve using reverse sidespin action",
  "topicId": "topic_serve",
  "difficulty": "intermediate",
  "status": "learning"
}
```

Creates node + skill row + primary `belongs_to` edge atomically.

### GET `/api/skills`

Query:

```text
q=
topicId=
status=
difficulty=
limit=
offset=
```

### GET `/api/skills/:id`

Includes:

```text
skill
node
primaryTopic
videos
notes
drills
mistakes
relatedSkills
prerequisites
learningPaths
```

### PATCH `/api/skills/:id`

Updating `topicId` updates the authoritative FK and mirror edge in one transaction.

### DELETE `/api/skills/:id`

Soft delete and revoke shares.

## 12. Notes API

### POST `/api/notes`

```json
{
  "parentNodeId": "node_video",
  "body": "Watch the wrist action",
  "noteType": "timestamp",
  "timestampSeconds": 195
}
```

Rules:

- parent is required;
- timestamp must be non-negative;
- timestamp note requires a video parent;
- create note node + note row atomically.

### GET `/api/notes`

Query:

```text
parentNodeId=
noteType=
q=
limit=
offset=
```

### GET `/api/notes/:id`

### PATCH `/api/notes/:id`

### DELETE `/api/notes/:id`

Soft delete.

## 13. Drills API

### POST `/api/drills`

```json
{
  "title": "50 short backspin serves",
  "description": "Aim half-long second bounce",
  "instructions": "Five sets of ten",
  "difficulty": "intermediate",
  "durationMinutes": 15,
  "repetitionTarget": 50,
  "status": "planned",
  "skillIds": ["skill_backspin_serve"],
  "videoIds": ["video_123"]
}
```

Creates node + drill row + graph edges atomically.

### GET `/api/drills`

Query:

```text
q=
skillId=
status=
limit=
offset=
```

### GET `/api/drills/:id`

### PATCH `/api/drills/:id`

### DELETE `/api/drills/:id`

Soft delete.

## 14. Mistakes API

### POST `/api/mistakes`

```json
{
  "title": "Contact too thick",
  "description": "Ball lacks spin",
  "correction": "Brush more finely",
  "skillIds": ["skill_reverse_pendulum"]
}
```

### GET `/api/mistakes`

Query:

```text
q=
skillId=
limit=
offset=
```

### GET `/api/mistakes/:id`

### PATCH `/api/mistakes/:id`

### DELETE `/api/mistakes/:id`

Soft delete.

## 15. Tags API

### POST `/api/tags`

```json
{
  "name": "sidespin",
  "tagType": "spin"
}
```

Creates tag graph node + tag row.

### GET `/api/tags`

Query:

```text
q=
limit=
offset=
```

Tag attachment uses graph edges with `edgeType=tagged_with`.

## 16. Graph API

The Graph API is for explicit linking/traversal, not a replacement for domain creation endpoints.

### POST `/api/graph/edges`

```json
{
  "sourceNodeId": "node_video",
  "targetNodeId": "node_skill",
  "edgeType": "explains",
  "label": null,
  "weight": null,
  "position": null
}
```

Rules:

- both nodes owner-visible;
- node-type pair valid;
- symmetric edge types canonicalized;
- duplicate active edge returns existing edge or `409` consistently.

### GET `/api/graph/nodes/:nodeId`

Returns graph-node DTO if owner-visible.

### GET `/api/graph/nodes/:nodeId/related`

Query:

```text
edgeType=
nodeType=
direction=outgoing|incoming|both
limit=
offset=
```

Private only.

### DELETE `/api/graph/edges/:edgeId`

Soft-delete edge.

### POST `/api/graph/nodes`

Not exposed in MVP normal UI.

If retained for administrative tooling, node creation must be tightly validated and cannot create a domain object without its required domain row. Recommendation: omit from MVP public/private app API.

## 17. Search API

### GET `/api/search`

Query:

```text
q=<required>
nodeType=video|skill|topic|note|drill|mistake|tag
limit=
offset=
```

Response:

```json
{
  "data": [
    {
      "nodeId": "node_123",
      "nodeType": "video",
      "title": "Reverse Pendulum Serve Tutorial",
      "snippet": "..."
    }
  ],
  "page": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

Rules:

- owner-scoped;
- deleted objects excluded;
- deterministic order;
- wildcard-safe query handling.

## 18. Share Links API

### POST `/api/share-links`

```json
{
  "nodeId": "node_123",
  "visibility": "unlisted",
  "expiresAt": null
}
```

Behavior:

- explicit user action;
- verify ownership and allowed node type;
- generate cryptographically random token;
- store token hash, not raw token;
- return raw token once.

Response:

```json
{
  "data": {
    "id": "share_123",
    "nodeId": "node_123",
    "shareToken": "raw-token-returned-once",
    "shareUrl": "/s/raw-token-returned-once",
    "visibility": "unlisted",
    "expiresAt": null,
    "createdAt": "2026-07-04T00:00:00.000Z"
  }
}
```

### GET `/api/share-links`

Lists current user's share links without raw token values.

Safe shape:

```json
{
  "data": [
    {
      "id": "share_123",
      "nodeId": "node_123",
      "tokenPrefix": "abc123",
      "visibility": "unlisted",
      "expiresAt": null,
      "revokedAt": null
    }
  ]
}
```

### PATCH `/api/share-links/:id`

Allowed operation:

```json
{
  "expiresAt": "2026-08-01T00:00:00.000Z"
}
```

Do not reactivate a revoked token. Create a new link instead.

### POST `/api/share-links/:id/revoke`

Explicit revocation.

Response:

```json
{
  "data": {
    "revoked": true
  }
}
```

### GET `/api/public/share/:shareToken`

Unauthenticated read-only endpoint.

Behavior:

- hash presented token;
- require active, non-expired, non-revoked link;
- target node must not be deleted;
- return only `ShareProjectionService` allowlisted DTO.

Example:

```json
{
  "data": {
    "share": {
      "nodeType": "skill",
      "title": "Reverse Pendulum Serve",
      "summary": "..."
    },
    "content": {},
    "related": []
  }
}
```

Never return:

- owner email;
- private notes not explicitly part of projection;
- arbitrary graph neighbors;
- internal IDs not needed by the public page;
- raw metadata payloads.

## 19. Learning Paths API

### POST `/api/learning-paths`

```json
{
  "title": "Improve Serve Receive",
  "description": "A focused sequence",
  "status": "draft"
}
```

### GET `/api/learning-paths`

### GET `/api/learning-paths/:id`

Returns ordered items.

### POST `/api/learning-paths/:id/items`

```json
{
  "nodeId": "node_skill",
  "position": 0,
  "note": null
}
```

Adds membership and traversal mirror transactionally.

### PATCH `/api/learning-paths/:id/items/:itemId`

```json
{
  "position": 2,
  "isCompleted": true
}
```

Reorder is transactional and produces contiguous positions.

### DELETE `/api/learning-paths/:id/items/:itemId`

Soft-delete membership and mirror edge.

## 20. Collections API

### POST `/api/collections`

```json
{
  "title": "Serve Videos",
  "description": "My best references"
}
```

### GET `/api/collections`

### GET `/api/collections/:id`

### POST `/api/collections/:id/items`

```json
{
  "nodeId": "node_video",
  "position": 0
}
```

### PATCH `/api/collections/:id/items/:itemId`

Reorder.

### DELETE `/api/collections/:id/items/:itemId`

Remove membership.

## 21. PWA Share Target Flow

`/share-target` is a same-origin Hono form receiver, not a JSON API endpoint and not merely a client-side SPA route. A static Vite route alone cannot reliably receive a navigation POST.

Preferred manifest behavior:

```text
POST application/x-www-form-urlencoded
```

Parameters:

```text
title
text
url
```

Receiver flow:

```text
1. Hono receives POST /share-target.
2. Authenticate current user in hosted mode.
3. Parse bounded form payload.
4. Extract likely URL.
5. Call the same InboxCaptureService used by POST /api/inbox.
6. Create Inbox item.
7. Redirect 303 to /quick-save/:inboxItemId.
```

Do not implement this by making the POST receiver call the application's own HTTP API. Reuse the domain service directly. If hosted authentication is missing/expired, do not create an ownerless private capture.

For development/browser compatibility, GET query parsing may be supported:

```text
/share-target?title=...&text=...&url=...
```

Do not log full shared payloads.

## 22. Concurrency and Idempotency

Mandatory idempotent operations:

- Inbox conversion through `converted_node_id`;
- seed operations;
- share revocation;
- safe retry of relationship creation.

For mutation requests where mobile retries can duplicate side effects, support an optional:

```text
Idempotency-Key
```

at service boundaries selected during implementation. At minimum, Inbox conversion must not depend on this header.

## 23. Caching

Private API responses:

```text
Cache-Control: no-store
```

Public share projections may use short-lived caching only after revocation semantics are preserved. MVP recommendation: no-store or very short revalidation.

## 24. Contract Tests

Before MVP release, test:

- every error envelope;
- pagination caps;
- owner isolation;
- soft deletion;
- Inbox conversion idempotency;
- graph edge validation;
- cross-owner edge rejection;
- public share expiry/revocation;
- public projection privacy;
- deleted-node share failure;
- malformed share-target payload;
- URL canonicalization duplicate behavior.
