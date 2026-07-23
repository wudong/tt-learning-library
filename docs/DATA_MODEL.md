# DATA_MODEL.md — Graph-Backed Data Model

> Architecture revision: 2.0  
> Reviewed: 2026-07-04  
> Status: canonical persistence contract

## 1. Purpose

This document defines the persistent data model for Table Tennis Learning Library.

Central rule:

> First-class learning objects are graph nodes. Meaningful cross-object relationships are typed graph edges. Domain tables store object-specific fields.

The app uses PostgreSQL through Kysely (`pg` driver, `PostgresDialect`). SQLite support has been deprecated.

Private application tables have PostgreSQL row-level security enabled with no
direct-client policies. Hosted browser clients authenticate with Supabase but
do not query the Supabase Data API; all private access remains behind the Hono
API, which connects as the migration-owned backend role and applies owner scope.

## 2. Database Conventions

### 2.1 IDs

All primary keys are text.

Recommended generator:

```text
<type_prefix>_<uuidv7>
```

Examples:

```text
node_...
edge_...
video_...
topic_...
skill_...
note_...
drill_...
mistake_...
path_...
collection_...
inbox_...
share_...
user_...
```

Requirements:

- database independent;
- generated in application code;
- collision resistant;
- never rely on hidden rowids or autoincrement.

### 2.2 Timestamps

Store UTC ISO 8601 strings:

```text
2026-07-04T12:34:56.789Z
```

Use consistently:

```text
created_at
updated_at
deleted_at
expires_at
revoked_at
completed_at
```

Do not mix epoch milliseconds into new tables.

### 2.3 Ownership

Hosted MVP:

- private rows are scoped by `user_id`;
- every repository query includes owner scope where the object is private;
- public access occurs only through share projection.

Local-only development may use one seeded user. Do not model local mode by removing ownership columns.

### 2.4 Soft Deletion

First-class objects use `deleted_at`.

Normal reads exclude deleted rows.

Normal API DELETE operations soft-delete. Hard purge is a separate administrative lifecycle.

## 3. Source-of-Truth Rules

These rules prevent dual-source drift.

1. **Domain fields**
   - Domain tables are authoritative for domain-specific fields and domain statuses.

2. **Universal graph fields**
   - `graph_nodes` is authoritative for graph identity, node type, display title, summary, visibility, and lifecycle timestamps.

3. **Semantic relationships**
   - `graph_edges` is authoritative for semantic cross-object relationships.
   - Private traversal considers both incoming and outgoing active edges.
   - Domain workflows are owner-scoped; permitted node-type pairs are enforced by the shared ontology.

4. **Ordered/stateful membership**
   - A specialized membership table is authoritative when order, completion, or membership-specific state is required.
   - A graph edge may be maintained as a traversal mirror in the same transaction.

5. **Primary parent relationships**
   - `skills.topic_id` is authoritative for a skill's primary topic; a matching `belongs_to` edge is transactionally maintained.
   - `topics.parent_topic_id` is authoritative for primary topic hierarchy; a matching graph relationship is transactionally maintained.

6. **Notes**
   - `notes.parent_node_id` is authoritative for the note's primary attachment.
   - Additional semantic links use graph edges such as `mentions`.

7. **Tags**
   - Tag membership uses `graph_edges(edge_type='tagged_with')`.
   - There is no separate `node_tags` MVP table.

8. **Learning paths**
   - `learning_path_items` is authoritative for item order and completion.
   - A `contains` graph edge is maintained for traversal.

When an intentional mirror cannot be updated atomically, the operation must fail and roll back.

## 4. Enumerations

Shared application constants and Zod schemas must validate these values.

### 4.1 Node Types

MVP:

```text
video
skill
topic
note
drill
mistake
learning_path
collection
tag
creator
source
```

A timestamped note is a `note` node with `note_type='timestamp'`; do not create a second node-type convention for the same concept.

Future:

```text
concept
tactic
player
coach
club
comment
```

Phase 2 Training:

```text
practice_session
```

### 4.2 Edge Types

MVP:

```text
belongs_to
contains
explains
demonstrates
practices
drill_for
related_to
requires
prerequisite_of
common_mistake_for
enables
mentions
contrasts_with
saved_from
created_by
tagged_with
copied_from
forked_from
```

Do not use both directions to express the same semantic fact unless the edge type itself requires it.

### 4.3 Visibility

```text
private
unlisted
public
```

MVP user-created nodes default to `private`.

## 5. Identity Table

### 5.1 `users`

Hosted identity record.

```text
id                  text primary key
email               text null
display_name        text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Constraints/indexes:

```text
unique lower(email) when email is not null
index deleted_at
```

Authentication-provider identifiers should be stored in a dedicated identity table if the chosen auth provider requires them; do not overload `email` as an immutable external ID.

## 6. Graph Tables

### 6.1 `graph_nodes`

Every first-class knowledge object.

```text
id                  text primary key
user_id             text not null references users(id)
node_type           text not null
title               text not null
summary             text null
visibility          text not null default 'private'
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Important rule:

> Domain status does not live here. Video status belongs to `videos.status`; skill status belongs to `skills.status`; and so on.

Indexes:

```text
index (user_id, node_type, deleted_at)
index (user_id, visibility, deleted_at)
index (updated_at)
```

### 6.2 `graph_edges`

Typed directed relationships.

```text
id                  text primary key
user_id             text not null references users(id)
source_node_id      text not null references graph_nodes(id)
target_node_id      text not null references graph_nodes(id)
edge_type           text not null
label               text null
weight              integer null
position            integer null
metadata_json       text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Indexes:

```text
index (user_id, source_node_id, edge_type, deleted_at)
index (user_id, target_node_id, edge_type, deleted_at)
index (user_id, edge_type, deleted_at)
```

Active-edge uniqueness:

```text
unique (user_id, source_node_id, target_node_id, edge_type)
where deleted_at is null
```

Validation rules:

- source and target nodes must exist;
- both nodes must be visible to the same owner for private graph writes;
- node type pair must be allowed for the edge type;
- self-edge is rejected unless explicitly allowed;
- `metadata_json` is schema-wrapped when used.

### 6.3 Symmetric Edges

For symmetric relationships such as:

```text
related_to
contrasts_with
```

canonicalize the pair before insert:

```text
source_node_id = min(nodeA, nodeB)
target_node_id = max(nodeA, nodeB)
```

This prevents duplicate A→B and B→A records.

## 7. Domain Tables

Every domain table with `node_id` must enforce one-to-one mapping:

```text
unique(node_id)
```

### 7.1 `videos`

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
source_url          text not null
canonical_url       text null
source_platform     text not null default 'other'
external_id         text null
title               text null
description         text null
thumbnail_url       text null
creator_name        text null
duration_seconds    integer null
status              text not null default 'saved'
importance          integer null
raw_metadata_json   text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Video statuses:

```text
saved
watching
watched
practicing
revisit
understood
```

Constraints/indexes:

```text
unique(node_id)
index (user_id, status, deleted_at)
index (user_id, source_platform, external_id)
index (user_id, canonical_url)
```

Service-level identity:

```text
known provider:
  (user_id, source_platform, external_id)

generic fallback:
  (user_id, canonical_url)
```

Use partial uniqueness where null behavior permits and keep duplicate resolution in the service layer.

### 7.2 `topics`

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
name                text not null
description         text null
parent_topic_id     text null references topics(id)
sort_order          integer not null default 0
is_system           integer not null default 0
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Constraints/indexes:

```text
unique(node_id)
index (user_id, parent_topic_id, deleted_at)
index (user_id, sort_order, deleted_at)
```

Rules:

- parent cannot equal self;
- hierarchy cycle must be rejected;
- `parent_topic_id` is authoritative;
- maintain corresponding graph relationship transactionally.

### 7.3 `skills`

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
topic_id            text null references topics(id)
name                text not null
description         text null
difficulty          text null
status              text not null default 'not_started'
is_system           integer not null default 0
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Skill statuses:

```text
not_started
learning
practicing
improving
comfortable
```

Difficulty values:

```text
beginner
intermediate
advanced
```

Rules:

- `topic_id` is the primary topic;
- maintain matching `belongs_to` graph edge transactionally;
- additional related topics, if later supported, use graph edges and do not overwrite primary topic.

### 7.4 `notes`

One table for plain and timestamped notes.

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
parent_node_id      text not null references graph_nodes(id)
body                text not null
timestamp_seconds   integer null
note_type           text not null default 'plain'
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Note types:

```text
plain
timestamp
question
takeaway
reminder
```

Rules:

- `parent_node_id` is required in MVP;
- `timestamp_seconds >= 0`;
- `timestamp_seconds` is allowed only for a video parent;
- `note_type='timestamp'` requires `timestamp_seconds`;
- chronological timestamp-note queries order by `timestamp_seconds`, then `created_at`.

### 7.5 `drills`

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
title               text not null
description         text null
instructions        text null
difficulty          text null
duration_minutes    integer null
repetition_target   integer null
status              text not null default 'planned'
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Drill statuses:

```text
planned
practicing
done
archived
```

Links to skills/videos use graph edges.

### 7.6 `mistakes`

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
title               text not null
description         text null
correction          text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Typical edge:

```text
mistake --common_mistake_for--> skill
```

### 7.7 `tags`

Tags are first-class graph nodes.

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
name                text not null
slug                text not null
tag_type            text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Constraints:

```text
unique(node_id)
unique active (user_id, slug)
```

Membership:

```text
node --tagged_with--> tag-node
```

No `node_tags` table in MVP.

### 7.8 `learning_paths`

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
title               text not null
description         text null
status              text not null default 'draft'
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Statuses:

```text
draft
active
completed
archived
```

### 7.9 `learning_path_items`

Authoritative ordered/stateful path membership.

```text
id                  text primary key
learning_path_id    text not null references learning_paths(id)
node_id             text not null references graph_nodes(id)
position            integer not null
note                text null
is_completed        integer not null default 0
completed_at        text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Constraints/indexes:

```text
unique active (learning_path_id, node_id)
unique active (learning_path_id, position)
index (learning_path_id, position, deleted_at)
```

Rules:

- positions are contiguous after mutation;
- reorder occurs in one transaction;
- maintain a `contains` edge from path node to item node.

### 7.10 `collections`

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
title               text not null
description         text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

### 7.11 `collection_items`

Authoritative collection membership when stable ordering is required.

```text
id                  text primary key
collection_id       text not null references collections(id)
node_id             text not null references graph_nodes(id)
position            integer not null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Constraints:

```text
unique active (collection_id, node_id)
unique active (collection_id, position)
```

Maintain a `contains` graph edge transactionally.

### 7.12 `creators`

Optional normalized creator/channel metadata.

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
name                text not null
source_platform     text null
external_id         text null
profile_url         text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Video relation:

```text
video --created_by--> creator
```

### 7.13 `sources`

Optional normalized source records.

```text
id                  text primary key
node_id             text not null references graph_nodes(id)
user_id             text not null references users(id)
platform            text not null
url                 text not null
external_id         text null
raw_metadata_json   text null
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Video relation:

```text
video --saved_from--> source
```

Do not require a `sources` row for every MVP video if it adds no value; `videos.source_*` fields remain sufficient for the core flow.

## 8. Workflow Tables

### 8.1 `inbox_items`

Low-friction captures waiting for organization.

```text
id                  text primary key
user_id             text not null references users(id)
source_url          text null
canonical_url       text null
shared_title        text null
shared_text         text null
source_platform     text null
thumbnail_url       text null
creator_name        text null
raw_payload_json    text null
status              text not null default 'new'
converted_node_id   text null references graph_nodes(id)
created_at          text not null
updated_at          text not null
deleted_at          text null
```

Statuses:

```text
new
saved
organized
archived
```

Rules:

- Inbox items are not graph nodes before conversion.
- Preserve raw payload within configured size limits.
- `converted_node_id` makes conversion idempotent.
- once set, repeated conversion returns the existing conversion;
- `organized` requires `converted_node_id`.

### 8.2 `share_links`

Explicit read-only sharing.

```text
id                  text primary key
user_id             text not null references users(id)
node_id             text not null references graph_nodes(id)
token_hash          text not null unique
token_prefix        text not null
visibility          text not null default 'unlisted'
created_at          text not null
updated_at          text not null
expires_at          text null
revoked_at          text null
deleted_at          text null
```

Rules:

- raw token is never persisted;
- token material has at least 256 bits of cryptographic randomness;
- `token_hash` is a SHA-256 digest of the raw high-entropy token, encoded consistently;
- public lookup hashes the presented token;
- target node must not be deleted;
- revoked or expired links return not found/gone according to API contract;
- public DTO is built by `ShareProjectionService`;
- `private` is not a meaningful active public link visibility; normal share creation uses `unlisted` unless product scope explicitly enables `public`.

Indexes:

```text
index (user_id, node_id, revoked_at, deleted_at)
index (token_prefix)
```

`token_prefix` is for safe administration/log correlation only and is not sufficient for lookup.

## 9. Graph Relationship Validation

Shared validation in `packages/shared/src/constants/ontology.ts` defines the complete MVP vocabulary and allowed node-type pairs. Domain workflows create these relationships; there is no generic user-facing edge editor.

Examples:

```text
video       --explains-->            skill
video       --demonstrates-->        skill
video       --belongs_to-->          topic
skill       --belongs_to-->          topic
topic       --belongs_to-->          topic
drill       --practices-->           skill
drill       --drill_for-->           video
mistake     --common_mistake_for-->  skill
skill       --requires-->            skill
skill       --prerequisite_of-->     skill
video       --related_to-->          video
skill       --related_to-->          skill
topic       --related_to-->          topic
drill       --related_to-->          drill
note        --mentions-->            video | skill | topic | drill | mistake
video | skill | note | drill | mistake | learning_path --tagged_with--> tag
video       --created_by-->          creator
video       --saved_from-->           source
learning_path --contains-->           video | skill | drill | note
collection  --contains-->            video | skill | drill | note
practice_session --practices-->      skill
practice_session --contains-->       drill | video
```

Reject invalid combinations before insert.

## 9.1 Training Session Authority

`practice_sessions` owns the private session lifecycle, local calendar date,
entry mode, UTC start/completion timestamps, overall rating, and reflection.

`practice_session_blocks` owns ordered and stateful session membership. It is
authoritative for the selected Skill, optional linked Drill and Video, original
and current target duration/position, actual active seconds, timer anchor, block
status, and focus cue.

`practice_skill_checkins` owns one optional confidence value and note per
Session/Skill pair.

Graph mirrors are maintained in the same transaction:

```text
practice_session --practices--> skill
practice_session --contains-->  drill
practice_session --contains-->  video
```

Block rows remain authoritative when the same object is used by more than one
block. Training sessions are always `private` and are not shareable.

## 10. Deletion Semantics

Deleting a graph-backed domain object:

```text
1. set domain.deleted_at
2. set graph_nodes.deleted_at
3. set affected graph_edges.deleted_at where the deleted node participates
4. revoke active share_links for the node
5. commit
```

Do not physically cascade-delete the learning graph during normal product deletion.

For membership rows, soft-delete membership and its traversal mirror in the same transaction.

## 11. Query Patterns

The schema must efficiently support:

- videos for a skill;
- skills explained by a video;
- notes for a video;
- timestamp notes ordered by time;
- drills for a skill;
- related skills;
- primary topic for a skill;
- child topics;
- path items ordered by position;
- incomplete path items;
- active share links for a node;
- public/unlisted node lookup by token hash;
- cross-object search;
- owner-scoped graph traversal;
- recently updated learning objects.

All queries exclude deleted rows unless explicitly requested.

## 12. Search Model

MVP:

- SQL `LIKE`;
- owner-scoped;
- deterministic ordering;
- capped pagination;
- wildcard escaping;
- service abstraction.

Search fields:

```text
graph_nodes.title
graph_nodes.summary
videos.title
topics.name
skills.name
notes.body
drills.title
drills.description
tags.name
```

Future:

- PostgreSQL full-text search;
- embeddings/vector search after core validation.

## 13. Seed Data

Seed records are idempotent and owned by the seeded user or explicitly represented as system content.

The curated Topic and Skill definitions live in
`packages/shared/src/constants/ontology.ts`. `ONTOLOGY.md` defines their
coverage matrix, scope boundaries, and governance policy.

The listed Topics and Skills form the protected MVP ontology. They are
provisioned idempotently for each owner with `is_system=1`. User-created Topic
and Skill rows are not supported in the MVP UI or private API.

## 14. Migration and Portability Rules

- explicit Kysely migrations;
- schema types generated/maintained from the actual migration contract;
- no autoincrement assumptions;
- no unwrapped JSON dependence;
- migration from empty DB tested;
- previous-release upgrade tested;
- PostgreSQL migration reviews timestamp, boolean, JSON, index, and search differences.

## 15. Non-Goals for MVP

Do not add yet:

- collaboration permissions;
- comments/reactions;
- billing;
- AI transcript chunks;
- embeddings;
- vector DB;
- graph DB;
- complex organization tenancy;
- real-time sync schema.
