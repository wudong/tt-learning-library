# Table Tennis Learning Library — Product Requirements Document

> Product revision: 2.1  
> Reviewed: 2026-07-04  
> Status: canonical MVP product scope

## 1. Product Summary

Table Tennis Learning Library is a mobile-first Progressive Web App that helps table tennis players capture, organize, annotate, connect, revisit, and selectively share tutorial videos as a structured personal learning system.

The product is intentionally table-tennis-specific. It is not a generic bookmark manager.

Core promise:

> Turn scattered coaching videos into a personal learning graph of skills, topics, notes, timestamped takeaways, drills, mistakes, and learning paths.

## 2. Target Users

Primary:

- club players;
- improving beginners;
- intermediate players;
- amateur competitors;
- junior players and parents;
- players who save many tutorials but cannot find or apply them later.

Secondary:

- coaches;
- clubs;
- advanced players creating structured resources.

## 3. User Problems

Users currently face:

- useful videos scattered across YouTube, Facebook, browsers, and messages;
- saved items organized by platform rather than skill;
- important moments buried in long videos;
- forgotten reasons for saving a video;
- passive watching that does not become practice;
- disconnected skills, drills, mistakes, and notes;
- no personal progress view by skill;
- poor sharing of a specific useful learning object without exposing a whole private library.

## 4. Product Principles

1. **Capture quickly**
   - native share capture reaches a durable Inbox without requiring classification or a second save action where supported;
   - manual paste fallback always available.

2. **Organize gradually**
   - Inbox is a first-class destination;
   - no forced taxonomy during capture.

3. **Learn by skill**
   - skills and topics are more important than generic folders.

4. **Watching should lead to practice**
   - notes, timestamp notes, drills, mistakes, and status are core.

5. **Graph quietly powers the product**
   - users see related knowledge, not database terminology.

6. **Private by default**
   - sharing is explicit and read-only.

7. **Mobile first**
   - core flows work comfortably on phone screens;
   - phone interaction is the baseline, not a compressed desktop layout;
   - safe areas, software keyboards, touch targets, narrow reflow, and one-handed reach are product requirements.

8. **State honesty**
   - the UI must describe what has actually been persisted;
   - durable capture, duplicate detection, offline behavior, and share-link state must never be represented ambiguously.

## 5. MVP Goals

The MVP must allow a user to:

1. save a tutorial through manual URL paste;
2. share a tutorial into the installed PWA where platform support allows;
3. save a raw capture to Inbox before organizing;
4. organize videos by topics, skills, and tags;
5. add plain and timestamped notes;
6. create drills from learning material;
7. link related learning objects;
8. track video progress, video learning state, and skill learning status;
9. search and filter the library;
10. create explicit read-only unlisted links for supported shareable objects;
11. recover safely from authentication/session interruption in hosted mode;
12. build a simple ordered learning path as late MVP.

## 6. MVP Non-Goals

Do not include:

- AI video summarization;
- automated transcript pipeline;
- public community feed;
- collaborative editing;
- native iOS/Android app;
- browser extension;
- advanced graph visualization;
- payments/subscriptions;
- complex offline sync;
- graph database;
- multi-organization permissions.

## 7. Requirements — MoSCoW

### 7.1 Must Have

| ID | Requirement |
|---|---|
| M1 | Manual URL save works for valid HTTP/HTTPS video links. |
| M2 | Installed PWA registers native share capture where supported. |
| M3 | Authenticated native share capture creates a durable Inbox item before the receipt screen and exposes honest Done/Organize/Discard actions. |
| M4 | Inbox supports messy capture and later organization. |
| M5 | Video conversion creates a graph-backed video atomically. |
| M6 | Users can organize videos with topics, skills, and tags. |
| M7 | Users can create/edit/delete plain notes. |
| M8 | Users can create/edit/delete timestamp notes and open supported source timestamps. |
| M9 | Skills have dedicated learning pages. |
| M10 | Users can create drills and link them to skills/videos. |
| M11 | Users can create manual graph relationships between supported objects. |
| M12 | Video progress, video learning state, and skill status are visible and filterable. |
| M13 | Search works across videos, skills, topics, notes, drills, and tags. |
| M14 | Private is the default visibility. |
| M15 | Explicit unlisted share links are read-only and revocable for the supported shareability matrix. |
| M16 | Hosted private deployments require authentication and owner isolation. |
| M17 | Core flows meet the mobile interaction contract and WCAG 2.2 AA target. |
| M18 | Hosted session expiry preserves safe continuation context and never silently loses a submitted capture or in-progress edit. |
| M19 | Exact duplicate identity follows one canonical product policy across manual capture, native capture, and Inbox conversion. |

### 7.2 Should Have

| ID | Requirement |
|---|---|
| S1 | Metadata extraction for known providers is best effort and failure tolerant. |
| S2 | Duplicate URL/provider identity is detected. |
| S3 | Common mistakes can be linked to skills. |
| S4 | Related-item sections appear on detail pages. |
| S5 | Simple ordered learning paths support completion state. |
| S6 | User export provides a portable backup of owned learning data. |
| S7 | Install guidance explains native share capture availability. |

### 7.3 Could Have

| ID | Requirement |
|---|---|
| C1 | Importance/rating on saved videos. |
| C2 | Lightweight graph overview. |
| C3 | Creator/source pages. |
| C4 | Locally stored recent-search shortcuts. |

### 7.4 Won't Have in MVP

| ID | Requirement |
|---|---|
| W1 | Automated AI coaching. |
| W2 | Community social feed. |
| W3 | Real-time co-editing. |
| W4 | Full offline mutation sync. |
| W5 | Graph database. |
| W6 | Payments. |
| W7 | Collections of mixed learning objects. |
| W8 | Public discoverable links. |

## 8. Core User Stories

### 8.1 Native Share Capture

As a player, I want to share a useful tutorial from another app into the installed PWA so that I can save it with minimal friction.

Acceptance criteria:

- system share sheet can target the installed PWA where supported;
- app receives title/text/url payload;
- app extracts likely URL;
- the authenticated server creates a durable Inbox item before redirecting to the receiving screen;
- the receiving screen honestly reports `Saved to Inbox`;
- user can choose `Done`, `Organize Now`, or explicitly `Discard Capture`;
- missing URL can be edited manually without pretending that a Video has been created;
- raw bounded payload is preserved;
- manual paste remains available.

### 8.2 Manual Save

As a player, I want to paste a tutorial URL so that capture works on unsupported devices and desktop.

Acceptance criteria:

- minimal URL-only save allowed;
- invalid URL gets useful error;
- platform detection is best effort;
- save to Inbox or organize now;
- exact duplicate behavior follows the canonical duplicate policy in section 8.14.

### 8.3 Inbox Organization

As a player, I want to save now and organize later.

Acceptance criteria:

- Inbox shows raw capture;
- title and URL can be corrected;
- user can assign existing/new skill, topic, tags, and quick note;
- conversion is idempotent;
- conversion creates graph node + video row + relationships atomically;
- archive is available.

### 8.4 Categorize a Video

As a player, I want to assign a video to relevant learning areas.

Acceptance criteria:

- zero or more topics;
- zero or more skills;
- new skill creation available;
- tags available;
- relationships backed by graph edges.

### 8.5 Add Notes

As a player, I want to store why a video matters.

Acceptance criteria:

- add/edit/delete;
- searchable;
- creation and update times visible where useful.

### 8.6 Add Timestamped Notes

As a player, I want a note tied to a moment in a video.

Acceptance criteria:

- input accepts `mm:ss` and `hh:mm:ss`;
- saved internally as seconds;
- chronological display;
- supported provider links open at time;
- edit/delete available.

### 8.7 Skill Pages

As a player, I want each skill to gather my learning material.

Acceptance criteria:

- title, topic, difficulty, status;
- linked videos;
- notes;
- drills;
- common mistakes;
- related/prerequisite skills;
- learning paths;
- explicit share action.

### 8.8 Track Learning State

Video tracking uses two explicit dimensions so consumption progress is not confused with learning intent.

Video progress:

```text
saved
watching
watched
```

Video learning state:

```text
none
practicing
revisit
understood
```

Skill status:

```text
not_started
learning
practicing
improving
comfortable
```

Acceptance criteria:

- progress/state is visible on detail views and compactly summarized on list views;
- filters may address video progress and video learning state independently;
- a video may be `watched` and `revisit` at the same time;
- domain fields have one authoritative source;
- practice relationships created through active drills do not silently overwrite video learning state.

### 8.9 Search and Filter

Acceptance criteria:

- search video title, skill, topic, tag, note content, and drill content;
- filters by relevant type/status/platform;
- mobile usable;
- deleted/private-other-user data excluded.

### 8.10 Link Related Items

Acceptance criteria:

- video to skills;
- video to related videos;
- skill to related/prerequisite skills;
- drill to skills/videos;
- note to mentioned objects;
- invalid relationship types rejected.

### 8.11 Create Drills

Acceptance criteria:

- title required;
- optional description/instructions;
- optional duration/repetition target;
- status `planned|practicing|done|archived`;
- link to skills/videos.

### 8.12 Explicit Sharing

As a player, I want to share one useful object without exposing my private library.

MVP shareability matrix:

| Object | MVP shareable | Notes |
|---|---:|---|
| Video | Yes | Allowlisted video projection only. |
| Skill | Yes | Allowlisted skill projection and safe related previews only. |
| Drill | Yes | Allowlisted drill projection only. |
| Learning Path | Late MVP | Enabled only when Learning Paths ship; path items use per-item safe projections. |
| Topic | No | Private browsing structure in MVP. |
| Note | No | May contain highly private context; defer explicit note sharing. |
| Mistake | No | Shared only when safely embedded in an allowlisted Skill projection. |
| Collection | No | Collections are post-MVP. |

Acceptance criteria:

- share is explicit;
- unlisted by default;
- read-only;
- creation copy states that anyone with the link can view the shared item but not the rest of the private library;
- token can be revoked;
- optional expiry;
- public view exposes only the allowlisted projection for the target object type;
- safe related previews are defined per target type and never produced by arbitrary graph traversal;
- deleted targets are unavailable.

### 8.13 Learning Path

Acceptance criteria:

- create path;
- add skills/videos/drills/notes;
- reorder items;
- mark item complete;
- preserve order transactionally.

This is late MVP and must not delay core capture, Inbox, notes, search, or sharing.

### 8.14 Canonical Duplicate Policy

Exact identity is determined by the technical canonicalization rules, but user-visible behavior is a product decision:

```text
Exact duplicate detected
  -> do not create another Video
  -> show "Already in your library"
  -> primary action: Open Existing
  -> secondary action: Keep Capture in Inbox only when the current raw capture contains useful unsaved context
  -> cancel/back leaves existing data unchanged
```

Rules:

- known-provider exact identity uses owner + provider + external ID;
- generic exact identity uses owner + canonical URL;
- Inbox conversion retry returns the existing conversion idempotently and does not present it as a new duplicate;
- MVP does not attempt fuzzy or semantic near-duplicate blocking;
- uncertain similarity may be surfaced later as a non-blocking suggestion.

### 8.15 Hosted Authentication and Session Recovery

Acceptance criteria:

- private routes require an authenticated owner in hosted mode;
- intended destination is preserved across sign-in where safe;
- session expiry during a form does not silently clear local draft state;
- a rejected write remains visibly unsaved and can be retried after authentication;
- unauthenticated native share capture never creates ownerless private data;
- after sign-in, the user resumes the intended safe flow or receives manual-paste fallback;
- sign-out clears private client caches and returns to a non-private route.

### 8.16 Difficulty Scale

Skills and drills use one product scale:

```text
unspecified
beginner
intermediate
advanced
```

Meaning:

- difficulty describes the complexity of the skill or drill, not the user's worth, ranking, or current ability;
- `unspecified` is the default;
- numeric difficulty ratings are not used in MVP.

### 8.17 Curated Topic and Skill Ontology

```text
Topic = broad learning area
Skill = specific capability to learn or improve
```

Rules:

- Topics and Skills are system-provided and cannot be created, edited, or deleted by users in MVP;
- the curated ontology is provisioned idempotently for every owner;
- users enrich the ontology with private Videos, Notes, Drills, Mistakes, learning state, and relationships;
- each Skill has one curated primary Topic;
- ontology extension is deferred until a reviewed governance and merge policy exists.

### 8.18 Junior Account Policy for Hosted MVP

For the hosted MVP:

- the account owner is an adult account holder;
- junior-player use is supported through a parent/guardian-managed account;
- direct child self-service account creation is not an MVP flow;
- this product decision does not replace jurisdiction-specific legal/privacy review before public launch.

## 9. Core Product Objects

### 9.1 Video

Fields:

```text
ID
graph node ID
source URL
canonical URL
source platform
external ID
title
description
thumbnail URL
creator
duration
progress status
learning state
importance optional
created/updated time
```

### 9.2 Topic

Examples:

```text
Serve
Receive
Spin
Forehand
Backhand
Footwork
Tactics
Match Analysis
```

Fields:

```text
ID
graph node ID
name
description
parent topic optional
sort order
system flag
```

### 9.3 Skill

Examples:

```text
Reverse Pendulum Serve
Banana Flick
Forehand Loop Against Backspin
Short Push Receive
Third-Ball Attack
```

Fields:

```text
ID
graph node ID
primary topic
name
description
difficulty
status
```

### 9.4 Note

Fields:

```text
ID
graph node ID
parent object
body
type
timestamp seconds optional
```

### 9.5 Drill

Fields:

```text
ID
graph node ID
title
description
instructions
difficulty
duration
repetition target
status
```

### 9.6 Mistake

Fields:

```text
ID
graph node ID
title
description
correction
```

### 9.7 Tag

Fields:

```text
ID
graph node ID
name
slug
type optional
```

### 9.8 Learning Path

Fields:

```text
ID
graph node ID
title
description
status
ordered items
item completion
```

### 9.9 Relationship

Examples:

```text
Video explains Skill
Skill belongs_to Topic
Drill practices Skill
Mistake common_mistake_for Skill
Skill requires Skill
Note mentions Skill
Node tagged_with Tag
```

### 9.10 Inbox Item

A workflow object before graph conversion.

Fields:

```text
raw shared payload
source URL
canonical URL
shared title/text
platform
status
converted node ID
```

### 9.11 Share Link

Fields:

```text
target node
token hash
visibility
expiry
revocation
```

## 10. Authentication and Privacy

### 10.1 Local Private Mode

May use a seeded user only when:

- app is local/private;
- API is not internet exposed.

### 10.2 Hosted MVP

Must have:

- authentication;
- owner-scoped private queries;
- private default visibility;
- explicit share links;
- no direct access to another user's object by guessed ID.

Exact auth provider is a technical implementation decision, not a reason to weaken requirements.

## 11. Information Architecture

Mobile navigation:

```text
Home | Inbox | Library | Search | More
```

Prominent action:

```text
Add Video
```

Phone placement rule:

- `Add Video` is a contextual floating quick action on Home, Inbox, and Library;
- it is hidden on keyboard-heavy forms and any screen where it would compete with a sticky primary action;
- it must remain above bottom navigation and safe-area insets and must never cover the last actionable list item.

Library leads with:

```text
Topics
Skills
Videos
Drills
Paths
```

The product should not lead with folders.

## 12. Key Screens

### 12.1 Home

- quick add;
- Inbox count;
- continue learning;
- recent videos;
- practicing skills.

### 12.2 Quick Save

Manual Add state:

- detected/editable URL;
- optional title;
- Save to Inbox;
- Organize Now.

Native Share receiving state after durable Inbox creation:

- `Saved to Inbox` confirmation;
- editable detected URL when correction is needed;
- Done;
- Organize Now;
- explicit Discard Capture action.

### 12.3 Inbox

- raw captures;
- organize;
- archive.

### 12.4 Video Detail

- source/open action;
- status;
- topics/skills/tags;
- notes;
- timestamp notes;
- drills;
- related items;
- paths;
- share.

### 12.5 Skill Detail

- overview;
- primary topic;
- difficulty/status;
- videos;
- notes;
- mistakes;
- drills;
- related/prerequisite skills;
- paths;
- share.

### 12.6 Search

- query;
- type filters;
- status/source filters where relevant;
- grouped or clearly typed results.

### 12.7 Authentication and Session Recovery

- sign-in entry;
- return-to-destination behavior;
- session-expired state;
- retry unsaved action after sign-in;
- sign-out;
- no ownerless capture state.

### 12.8 Shared View

- read-only;
- no owner-private navigation;
- safe related previews only.

## 13. Curated Learning Ontology

The protected ontology covers Fundamentals, Serve, Receive, Spin, Forehand,
Backhand, Footwork, Defense, Tactics, Doubles, Training & Drills, Match
Analysis, Physical Training, Mental Game, Equipment, Rules & Officiating, Para
Table Tennis, and Coaching.

The detailed coverage matrix and governance policy are defined in
`ONTOLOGY.md`. Users enrich the ontology with private learning material rather
than creating Topics or Skills.

## 14. Success Metrics

MVP validation metrics:

1. **Capture completion**
   - percentage of initiated capture flows that create a durable Inbox item or organized Video;
   - discards are tracked separately from technical failures.

2. **Time to capture**
   - median time from Quick Save screen to saved Inbox item.

3. **Organization rate**
   - percentage of Inbox items converted within 7 days.

4. **Learning enrichment**
   - percentage of saved videos with at least one skill/topic/note/drill within 14 days.

5. **Revisit behavior**
   - percentage of weekly active users reopening an existing learning object.

6. **Search success proxy**
   - percentage of searches followed by opening a result.

7. **Practice conversion**
   - percentage of active users creating at least one drill.

8. **Share safety**
   - zero confirmed private-data leaks through public share projections.

Instrumentation must respect privacy and avoid storing note bodies or raw shared payloads in analytics.

### 14.1 MVP Analytics Event Contract

Minimum event dictionary:

```text
capture_started
capture_completed
capture_discarded
capture_failed
inbox_organized
inbox_archived
search_submitted
search_result_opened
note_created
timestamp_note_created
drill_created
share_link_created
share_link_revoked
```

For each event, the implementation plan must define:

- exact trigger point;
- allowed properties;
- forbidden properties;
- deduplication/idempotency behavior where retries are possible.

Forbidden analytics payloads include:

```text
note body
raw shared text
raw shared payload
auth cookie
share token
full private URL when it may contain sensitive query data
```

## 15. MVP Release Criteria

Release only when:

- manual paste works;
- native share capture works on at least one explicitly named and recorded installed-PWA target combination and degrades gracefully to manual paste elsewhere;
- the release record names exact tested OS/browser/install-mode combinations; native receive-share support is verified rather than assumed;
- the release QA matrix covers at least 320 CSS px narrow reflow, a 360–390 CSS px primary phone, and a 412–430 CSS px large phone;
- critical flows remain usable with the software keyboard visible;
- bottom navigation, sticky actions, sheets, and floating quick actions respect safe-area insets;
- critical controls meet the project mobile hit-area rule;
- portrait is primary, landscape remains functional, and no non-essential flow requires one orientation;
- WCAG 2.2 AA acceptance target is tested for critical flows, including screen-reader smoke tests, keyboard operation, reduced motion, and 200% zoom/narrow reflow;
- hosted sign-in, session-expiry recovery, sign-out cache clearing, and unauthenticated share-target behavior pass;
- Inbox conversion is transactional/idempotent;
- canonical exact duplicate behavior is consistent across capture and conversion;
- graph-backed videos/topics/skills/notes/drills work;
- Mistake CRUD/linking works if S3 is included in the release;
- timestamp notes work, including unsupported-provider fallback;
- search works and preserves query/filter/scroll context on back navigation;
- explicit unlisted sharing and revocation work only for the shareability matrix;
- owner isolation tests pass for hosted mode;
- public projection privacy tests pass;
- prompted PWA update clearly warns that `Update now` reloads the app and may discard in-progress edits;
- mobile critical-path E2E passes;
- backup and restore process has been exercised;
- no unresolved P0 architecture/security defects remain.

## 16. Post-MVP Roadmap

### Phase 2 — Better Learning System

- training plans, practice sessions, and progress history as defined in section 17;
- richer paths;
- better metadata;
- collections of mixed learning objects;
- graph overview.

### Phase 3 — Assisted Organization

- optional metadata suggestions;
- optional taxonomy suggestions;
- optional summaries with explicit user review.

### Phase 4 — Community and Collaboration

## 17. Training Planner and Practice Tracking

Training is a private, account-owner-only Phase 2 feature that turns the learning
library into table-side practice.

### 17.1 Core behavior

- A dated training plan contains an ordered list of skill blocks.
- Every block requires one curated Skill and a target duration.
- A block may include one Drill, one Video, and a short focus cue. The Drill and
  Video must already be graph-linked to the selected Skill.
- More than one session may exist on the same local calendar date.
- Users may create a dated plan, quick-start an unplanned session, copy an
  existing plan to another date, or manually log past training.
- A live session presents one skill block at a time. The timer can start, pause,
  resume, finish, or skip. Only one block may run at a time.
- Reaching the target prompts the user to continue, add time, or finish. The next
  block never starts automatically.
- Remaining blocks may be added, reordered, skipped, or have their duration
  changed while training. Original planned values remain available for plan
  comparison.
- Completing a session may include an optional overall 1–5 rating, optional
  notes, and one optional 1–5 confidence check-in per distinct practiced Skill.
  Confidence history does not overwrite Skill status or difficulty.

### 17.2 Calendar and insights

- The Training destination opens a mobile month calendar.
- Each day cell shows planned/completed state and total actual minutes; selecting
  a date opens its session list and skill details.
- Week and month insights show training days, actual time, planned-session
  completion, planned versus actual time, time by Skill, and confidence trends.
- Plans, actual time, ratings, confidence, and reflections remain private and
  are not included in public share projections.

### 17.3 PWA timer expectation

- While the active session is visible, the app requests screen wake lock where
  supported and uses an in-app prompt plus optional sound/vibration.
- Elapsed time is reconstructed from persisted UTC timestamps after reload.
- Background and locked-screen alerts are best effort because mobile browsers
  may suspend installed PWAs. The UI must explain this limitation and must not
  claim native-alarm reliability.

- public libraries;
- coach/student workflows;
- collaborative editing;
- comments/reactions.

### Phase 5 — Advanced Graph

- richer traversal;
- recommendations;
- graph visualization;
- advanced search/vector features.

## 17. Resolved Product Decisions

The following previously ambiguous items are resolved:

1. Native PWA share capture is **MVP**, with manual paste fallback.
2. Native share capture uses **durable Inbox-first semantics**: the Inbox item exists before the receiving UI; the UI says `Saved to Inbox` and offers Done, Organize Now, or Discard Capture.
3. Basic explicit unlisted sharing is **MVP** only for the section 8.12 shareability matrix; community sharing is not.
4. Hosted private deployments require authentication and session-recovery UX.
5. Learning paths are late MVP and must not block core flows.
6. Collections are **post-MVP** and are removed from MVP routes, APIs, visible object model, and sharing.
7. The graph backbone is required from the first schema.
8. Inbox items are workflow records before conversion, not graph nodes.
9. Timestamped notes use the `note` node type with timestamp fields.
10. Exact duplicate identity follows section 8.14; MVP does not block fuzzy/semantic near-duplicates.
11. Video consumption progress and video learning state are separate dimensions.
12. Difficulty uses `unspecified|beginner|intermediate|advanced`.
13. Curated Topics and Skills are protected system ontology entries; users attach private learning material rather than extending the ontology in MVP.
14. Hosted MVP account ownership is adult; junior use is parent/guardian-managed.
15. The mobile UI baseline includes narrow reflow, safe areas, software keyboards, explicit touch-target rules, and phone-first action hierarchy.
