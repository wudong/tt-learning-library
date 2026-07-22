# UX_FLOWS.md — User Flows and Screen Behavior

> UX revision: 2.1  
> Reviewed: 2026-07-04

## 1. Purpose

This document defines the primary user flows for Table Tennis Learning Library.

Core idea:

> Capture quickly, organize gradually, learn actively, revisit easily, and share explicitly.

## 2. Primary Navigation

Mobile:

```text
Home | Inbox | Library | Search | More
```

Prominent action:

```text
Add Video
```

Desktop may replace bottom navigation with a sidebar without changing route semantics.

## 3. Onboarding Flow

### Goal

Explain the product and native share capture without blocking use.

### Flow

1. User opens app.
2. App explains:
   - save table tennis tutorials;
   - organize by topic/skill;
   - add notes and timestamp notes;
   - turn insights into drills;
   - connect related learning;
   - share only when explicitly chosen.
3. If install is supported, show install guidance.
4. Explain that native share capture depends on installed-PWA and platform support.
5. User may skip.
6. In hosted mode, user signs in before entering private library routes; intended destination is preserved where safe.
7. User lands on Home.

### Acceptance Criteria

- table-tennis purpose is clear;
- manual paste is always visible;
- install prompt is not a hard gate;
- privacy default is not misrepresented.

## 3.1 Home Continue-Learning Ranking

`Continue Learning` is deterministic:

```text
1. incomplete Learning Path item, when Paths are enabled
2. Video progress = Watching
3. Video learning state = Revisit
4. Skill status = Practicing
```

Rules:

- maximum 5 items;
- most recently interacted first within a priority group;
- empty groups are skipped;
- no arbitrary graph-neighbor recommendation is presented as personalized guidance.

## 4. Native Share Capture Flow

### Goal

Capture a tutorial from another app with minimal friction.

### Preferred Flow

1. User opens system share action in external app.
2. User selects Table Tennis Learning Library where supported.
3. Same-origin Hono server receives the navigation POST at `/share-target`.
4. Server authenticates the current user in hosted mode.
5. Server parses bounded `title`, `text`, and `url`.
6. Server extracts likely valid URL.
7. Server calls the same Inbox capture domain service used by the JSON API.
8. Server creates a durable Inbox item.
9. Server returns `303` to `/quick-save/:inboxItemId`.
10. User sees:
   - `Saved to Inbox`;
   - detected title;
   - source/platform;
   - editable URL when correction is needed.
11. User chooses:
   - `Done`;
   - `Organize Now`;
   - `Discard Capture`.

### Failure Branches

**No URL detected**

- the raw Inbox capture remains durable;
- show editable URL field;
- preserve safe capture context;
- explain that no Video has been created yet;
- do not create a Video until valid.

**Inbox creation failed**

- show retry;
- do not claim save succeeded.

**Exact duplicate**

- do not create another Video;
- show `Already in your library`;
- primary action `Open Existing`;
- offer `Keep Capture in Inbox` only when the current raw capture contains useful unsaved context.

### Acceptance Criteria

- the server persists the Inbox item before the receipt screen;
- the receipt screen never shows `Save to Inbox` for an already-persisted item;
- raw bounded payload is preserved;
- repeated conversion is idempotent;
- Discard Capture has an explicit destructive meaning;
- manual fallback exists.

## 5. Manual Paste Save Flow

### Goal

Support desktop and platforms without native share target.

### Flow

1. User taps Add Video.
2. User pastes URL.
3. App validates URL.
4. App best-effort detects provider.
5. User chooses:
   - Save to Inbox;
   - Organize Now.
6. Optional title is allowed.

### Acceptance Criteria

- URL-only save works;
- useful validation error;
- metadata failure does not block capture;
- exact duplicate behavior follows section 33 and is identical to native-capture behavior.

## 6. Inbox Flow

### Goal

Process captures later.

### List Flow

1. User opens Inbox.
2. App shows new/saved captures.
3. Each card shows:
   - title or URL;
   - source;
   - capture time;
   - status.
4. User taps item.

### Detail/Organize Flow

1. App opens capture.
2. User may edit:
   - title;
   - URL;
   - topics;
   - skills;
   - tags;
   - quick note;
   - video progress;
   - video learning state.
3. User selects `Save as Video`.
4. App submits conversion.
5. Server atomically:
   - verifies owner;
   - canonicalizes URL;
   - creates/reuses video identity according to policy;
   - creates graph node;
   - creates video row;
   - creates edges;
   - creates optional note;
   - marks Inbox item organized.
6. App opens video detail.

### Retry Branch

If the client retries after an uncertain response:

- server checks `convertedNodeId`;
- returns existing conversion;
- UI shows existing video.

### Acceptance Criteria

- no data loss from raw capture;
- no duplicate conversion on retry;
- archive available;
- conversion failure leaves original Inbox item recoverable.

## 7. Video Detail Flow

### Goal

Make a saved tutorial useful for learning.

### Sections

1. Header
   - title;
   - thumbnail;
   - source;
   - Open Video;
   - video progress;
   - video learning state;
   - Share.

2. Organization
   - topics;
   - skills;
   - tags.

3. Notes
   - plain notes;
   - timestamp notes sorted by time.

4. Practice
   - drills.

5. Related knowledge
   - related videos;
   - related skills;
   - mistakes;
   - paths.

### Actions

```text
Add Note
Add Timestamp Note
Create Drill
Link Related Item
Add to Path
Share
Edit
Delete
```

Phone hierarchy:

- `Open Video` is the single dominant primary action;
- show at most four direct quick actions: Note, Timestamp, Drill, More;
- place Edit/Delete and other low-frequency actions under More;
- returning from an external source restores the same detail route and practical scroll context.

### Acceptance Criteria

- source opens quickly;
- related items are graph-backed;
- deleted objects disappear from normal related lists;
- share is explicit.

## 8. Add Timestamp Note Flow

### Goal

Remember an important moment in a tutorial.

### Flow

1. User taps Add Timestamp Note.
2. User enters:
   - `mm:ss` or `hh:mm:ss`;
   - note body.
3. Client validates format.
4. Server validates non-negative seconds and video parent.
5. Note is saved.
6. Detail page inserts note in chronological order.
7. User taps timestamp.
8. App opens provider-specific timestamp URL where supported.

### Edge Cases

- `00:00` is valid;
- malformed values show a field-linked error;
- negative values are invalid;
- when duration is known, a timestamp beyond duration is rejected with an actionable error;
- when duration is unknown, a non-negative syntactically valid timestamp may be saved;
- editing a timestamp immediately repositions the note chronologically;
- unsupported provider deep-linking preserves the note and opens the base Video;
- changing the source URL never silently deletes timestamp notes.

### Acceptance Criteria

- valid common formats;
- internal storage in seconds;
- edit/delete;
- chronological reorder after edit;
- unsupported provider still preserves note and can open base video.

## 9. Skill Page Flow

### Goal

Make the skill the central unit of improvement.

### Sections

```text
Header
Overview
Linked Videos
Key Notes
Common Mistakes
Drills
Related Skills
Prerequisites
Learning Paths
```

### Actions

```text
Add Video
Add Note
Add Mistake
Create Drill
Link Related Skill
Share
Edit
```

### Acceptance Criteria

- primary topic visible;
- status editable;
- skill relationships graph-backed;
- share view does not expose private unrelated data.

## 10. Topic Page Flow

### Goal

Browse broader table-tennis areas.

### Sections

```text
Child Topics
Skills
Videos
Notes
Drills
Related Topics
```

### Acceptance Criteria

- hierarchy is cycle-safe;
- skills preferred over generic folders;
- deleting topic with active children produces a clear conflict flow;
- seed Topics are protected from hard deletion;
- user-created Topics are created through explicit Topic management, not inline fast capture.

## 11. Link Related Items Flow

### Goal

Create meaningful relationships without exposing graph jargon.

### Flow

1. User taps Link Related Item.
2. App shows relationship options valid for source object.
3. User selects relationship meaning.
4. User searches/selects target.
5. App shows review sentence, for example:
   - `This video explains Reverse Pendulum Serve`.
6. User confirms.
7. Server validates node types and ownership.
8. Relationship appears in relevant sections.

### Relationship Options

Examples:

```text
Explains
Demonstrates
Practices
Related to
Requires
Prerequisite of
Common mistake for
Mentions
```

### Acceptance Criteria

- invalid pairs not shown;
- duplicate symmetric relationship not created;
- cross-owner private link rejected;
- relationship removal is available and follows section 29.

## 12. Drill Creation Flow

### Goal

Turn learning into practice.

### Flow

1. User starts from:
   - video;
   - skill;
   - drill list.
2. User enters:
   - title;
   - optional description;
   - optional instructions;
   - difficulty;
   - duration;
   - repetition target;
   - status.
3. Starting context preselects related link.
4. User adds other skills/videos.
5. User saves.
6. Drill appears on linked objects.

### Acceptance Criteria

- title required;
- graph links created atomically with drill;
- status editable.

## 13. Search and Filter Flow

### Goal

Find material quickly.

### Flow

1. User opens Search.
2. Before the first query, app shows a neutral prompt, not a no-results error.
3. User enters at least 2 non-whitespace characters.
4. App searches after approximately 250 ms debounce; Search/Enter submits immediately.
5. Results are clearly typed.
6. User optionally opens a mobile filter sheet and changes:
   - object type;
   - topic;
   - skill;
   - video progress;
   - video learning state;
   - skill status;
   - source platform.
7. User selects `Apply`; `Clear all` removes filter state.
8. User opens result.
9. Back navigation preserves query, filters, practical scroll position, and pagination position.

### States

```text
Initial
Typing
Loading
Results
No results
No results because filters
Pagination loading
Pagination failed
Offline unavailable
Recoverable error
```

### Acceptance Criteria

- mobile usable;
- deleted objects excluded;
- owner isolation;
- deterministic incremental pagination;
- accessible explicit `Load more` path exists;
- note content searchable;
- MVP stores no server-side recent-search history;
- result count/status changes are announced appropriately to assistive technology.

## 14. Share Object Flow

### Goal

Share one object without exposing the private library.

### Shareable MVP Objects

| Object | MVP shareable |
|---|---:|
| Video | Yes |
| Skill | Yes |
| Drill | Yes |
| Learning Path | Late MVP, only when Paths ship |
| Topic | No |
| Note | No |
| Mistake | No as an independent target |
| Collection | No; post-MVP |

### Flow

1. User taps Share.
2. If no active link:
   - show `Anyone with this link can view the shared item. They cannot access the rest of your private library.`;
   - choose unlisted;
   - choose expiry: Never, 1 day, 7 days, 30 days, or Custom;
   - Create Link.
3. Server returns raw token once.
4. UI offers:
   - Copy Link;
   - Open Shared View.
5. Link management later shows token prefix, not raw token.
6. User can revoke.

### Acceptance Criteria

- explicit action;
- private default;
- read-only;
- token not recoverable from database;
- revocation immediate.

## 15. Public Shared View Flow

### Goal

Provide safe read-only access.

### Flow

1. Visitor opens `/s/:shareToken`.
2. Frontend calls public share API.
3. Server:
   - hashes token;
   - checks active/expiry/revocation;
   - checks target not deleted;
   - builds allowlisted projection.
4. Frontend renders read-only page.

### Failure States

```text
Invalid link
Expired link
Revoked link
Deleted target
```

User-facing copy may use one non-disclosing unavailable state.

### Acceptance Criteria

- no private app navigation;
- no arbitrary graph traversal;
- related previews come only from the target-type allowlist;
- no owner email;
- no edit actions.

## 16. Learning Path Flow

### Goal

Follow an ordered sequence.

### Flow

1. User creates path.
2. Adds existing skill/video/drill/note.
3. Reorders.
4. Marks items complete.
5. App shows progress.

### Accessibility

Provide button/menu alternatives:

```text
Move Up
Move Down
Move to Position
```

Do not require drag-and-drop.

### Acceptance Criteria

- order is transactional;
- positions remain contiguous;
- completion persists;
- traversal mirror remains consistent.

## 17. Delete Flow

### Goal

Remove an item safely.

### Flow

1. User selects Delete.
2. UI explains effect.
3. User confirms.
4. Server soft-deletes domain row + graph node, tombstones affected edges, revokes shares.
5. UI removes item from normal views.

### Acceptance Criteria

- normal reads exclude item;
- public links stop working;
- no destructive physical cascade during normal delete.

## 18. Empty States

Home:

> Save a table tennis tutorial to start building your learning library.

Inbox:

> Your Inbox is clear. Share a tutorial into the app or paste a link.

Search:

> No matching learning items. Try a broader term or clear a filter.

Skill videos:

> No videos linked yet. Add a tutorial that explains or demonstrates this skill.

## 19. Error States

Required examples:

- invalid URL;
- no URL in share payload;
- duplicate/existing item;
- offline private mutation;
- expired/revoked share;
- unauthorized session;
- conflict deleting topic with children.

Errors should explain the next safe action.

## 20. Accessibility and Mobile Usability

Target:

```text
WCAG 2.2 Level AA for the mobile-first PWA
```

Phone baseline:

```text
320 CSS px narrow reflow target
360–390 CSS px primary phone target
412–430 CSS px large-phone target
portrait primary
landscape functional
```

Requirements:

- visible focus that is not obscured by sticky UI;
- semantic headings and landmarks;
- labelled icon controls;
- non-color status text;
- critical phone hit areas at least 44 × 44 CSS px;
- primary buttons generally at least 48 CSS px high;
- safe-area-aware top/bottom chrome;
- focused fields and sticky primary actions remain visible with the software keyboard open;
- accessible sheets/dialogs with focus restoration;
- form errors linked to fields and first invalid field reachable;
- keyboard navigation;
- reduced motion;
- 200% zoom/narrow reflow;
- reorder alternatives;
- no hover-only critical actions;
- async save/failure/result-count changes announced appropriately.

Critical-flow smoke tests include VoiceOver on an iPhone-class target and TalkBack on an Android-class target.


## 21. Hosted Authentication and Session Recovery Flow

### Goal

Protect private data without losing safe user context.

### Sign-In Flow

1. User enters a protected route or starts a protected action.
2. App checks session.
3. If valid, continue.
4. If invalid:
   - preserve intended destination where safe;
   - preserve an in-progress local draft when one exists;
   - show Sign In.
5. User signs in.
6. On success:
   - on Android, when the email link finishes in a browser, offer `Open installed app` using a same-origin callback whose auth values remain in the URL fragment;
   - return to intended safe destination;
   - show the unsaved action as ready to retry.
7. Retry automatically only when the operation is provably idempotent and the UI explicitly says it is resuming.

### Session Expires During Edit

1. User submits.
2. API returns stable authentication error.
3. App keeps entered form values.
4. App shows:

> Your session expired. Sign in to keep working. Your unsaved changes are still here.

5. User signs in.
6. App returns to the same form.
7. User retries save.

### Sign-Out

1. User chooses Sign Out.
2. App clears private server-state caches and private transient state.
3. App routes to a non-private screen.

### Native Share Without Session

1. `/share-target` receives POST.
2. Hosted session is invalid.
3. Server does not create ownerless private data.
4. User enters safe sign-in/recovery flow.
5. After sign-in, app resumes only safe bounded continuation or offers manual paste.

### Acceptance Criteria

- no ownerless capture;
- no silent draft loss;
- no private cache remains visible after sign-out;
- intended destination is not an open redirect;
- user understands whether an operation was saved or remains unsaved.

## 22. PWA Install and Update Flows

### 22.1 Installation Guidance

1. User may see install guidance only when relevant.
2. Guidance explains:
   - manual paste always works;
   - native receive-share depends on installed-PWA and platform support.
3. User may dismiss.
4. Dismissal does not block product use.
5. Already-installed state does not keep prompting.

States:

```text
Install available
Install unsupported
Already installed
Dismissed
```

### 22.2 App Update Available

1. App detects a new service worker.
2. Non-blocking prompt shows:
   - Update now;
   - Later.
3. Update now activates the new version and reloads the app; in-progress form edits may be lost.
4. Later keeps current session usable.
5. New update prompt may return at a reasonable later point.

Acceptance criteria:

- update occurs only after the user chooses Update now;
- update notification is accessible;
- capture is not blocked by update prompt.

## 23. Create, Edit, and Delete Skill Flow

### Create

1. User starts from Skill list, Topic, or an organization flow.
2. User enters:
   - name required;
   - description optional;
   - primary Topic optional;
   - difficulty: Unspecified, Beginner, Intermediate, Advanced;
   - status.
3. UI helper copy says:

> A Skill is a specific ability you want to learn or improve.

4. App checks exact owner-visible name conflicts according to API policy.
5. Save creates graph node + Skill row + primary-topic relationship atomically.

### Edit

- change name/description;
- change difficulty/status;
- change or clear primary Topic;
- save atomically.

### Delete

1. User chooses Delete from More.
2. UI explains that the Skill disappears from normal views and active shares stop working.
3. Confirm.
4. Server soft-deletes node/domain data and tombstones affected relationships according to policy.

Acceptance criteria:

- failed save preserves form values;
- changing primary Topic cannot create invalid mirror state;
- deletion does not physically cascade unrelated objects.

## 24. Topic Management Flow

### Product Rule

```text
Topic = broad learning area
Skill = specific capability to learn or improve
```

Seed Topics are protected from hard deletion.

### Create User Topic

1. User opens explicit Topic management.
2. User enters:
   - name required;
   - description optional;
   - parent Topic optional.
3. UI helper copy says:

> A Topic is a broad area such as Serve, Footwork, or Tactics.

4. Server validates owner scope and hierarchy cycle safety.
5. Save.

Fast capture does not create Topics inline.

### Edit/Move

- rename user Topic;
- edit description;
- change parent when cycle-safe.

### Delete

- user Topic with active children returns clear conflict state;
- UI offers safe next action such as move/delete children first;
- seed Topic hard deletion is unavailable.

## 25. Tag Management Flow

### Goal

Allow lightweight organization without taxonomy chaos.

### Flow

1. User types in Tag picker.
2. Existing matching Tags appear first.
3. Exact normalized duplicate is not created.
4. User may create a new Tag when no exact match exists.
5. Save attaches Tag.

Rules:

- matching is case-normalized according to the data contract;
- creation never blocks fast capture unnecessarily;
- rename/delete is available from explicit Tag management;
- delete removes Tag relationships but does not delete tagged objects;
- tag merge is post-MVP unless separately scheduled.

## 26. Plain Note Create/Edit/Delete Flow

### Create

1. User starts from a supported parent object.
2. User enters note body.
3. Save.
4. Note appears without requiring classification.

### Edit

- preserve text after recoverable error;
- session-expired behavior follows section 21.

### Delete

- lightweight Note deletion uses immediate feedback with Undo where technically safe;
- otherwise use a clear confirmation.

Acceptance criteria:

- body is searchable;
- no note body is sent to analytics;
- errors do not silently clear text;
- parent remains valid and owner-visible.

## 27. Mistake Create/Edit/Link Flow

### Goal

Capture common errors and corrections for Skills.

### Create from Skill

1. User taps Add Mistake.
2. Skill is preselected.
3. User enters:
   - title required;
   - description optional;
   - correction optional.
4. User may link additional owner-visible Skills.
5. Save creates Mistake + relationships atomically.

### Edit

- edit content;
- add/remove linked Skills.

### Unlink

- unlinking from one Skill does not delete the Mistake.

### Delete

- follows global destructive-action policy;
- Mistake is not independently shareable in MVP.

## 28. Drill Edit, Archive, and Delete Flow

Creation remains defined in section 12.

### Edit

- update content, difficulty, targets, status, and links;
- starting context remains visible.

### Archive

- immediate action with Undo where safe;
- archived Drills disappear from normal active lists unless filter includes Archived.

### Delete

- high-impact delete requires confirmation;
- normal delete is soft delete.

Difficulty values:

```text
Unspecified
Beginner
Intermediate
Advanced
```

## 29. Relationship Removal and Change Flow

### Remove

1. User opens related-item action.
2. Chooses Remove Relationship.
3. UI states the actual relationship sentence.
4. Remove immediately with Undo where safe.
5. Target object is not deleted.

### Change Meaning

1. User chooses Change Relationship when supported.
2. Select valid new meaning.
3. Review sentence.
4. Save atomically.

Acceptance criteria:

- invalid pairs are never offered;
- removing a relationship never implies object deletion;
- duplicate symmetric relationships are not created;
- deleted targets disappear from normal relationship pickers.

## 30. Share-Link Management Flow

1. User opens More/Settings → Shared Links.
2. Each row shows:
   - object title;
   - object type;
   - token prefix only;
   - created time;
   - expiry;
   - active/revoked state.
3. User may:
   - Open Shared View;
   - Copy Link only when raw link is still available in current creation context;
   - Revoke active link.
4. Revocation requires confirmation.
5. Revoked link becomes unavailable immediately.

Rules:

- persisted raw token is never displayed;
- creating a new link does not silently revoke older links unless product policy explicitly changes later;
- multiple active links are allowed only if the API contract supports them consistently; otherwise creation returns the existing active link state without pretending to recover a raw token.

## 31. User Export Flow

This flow applies when Should-Have S6 ships.

1. User opens Settings → Export Data.
2. App explains export contents and exclusions.
3. User chooses Create Export.
4. Server creates a portable owned-data export without exposing other users' data.
5. UI shows:
   - Preparing;
   - Ready;
   - Failed.
6. User retrieves export through the authenticated flow.

Acceptance criteria:

- export is not described as server backup;
- share tokens/auth secrets are excluded;
- raw capture payload inclusion is explicit and privacy-reviewed;
- failure is retryable.

## 32. Offline Read and Mutation Flow

MVP does not promise private offline reads because private API JSON is NetworkOnly.

### Already-Rendered Screen

- may remain visible in memory;
- app does not label stale content as freshly synchronized.

### New Private Navigation While Offline

Show:

> You're offline. Reconnect to load this content.

### Private Mutation While Offline

Show:

> You're offline. Reconnect to save changes.

Rules:

- no fake queued state;
- no automatic mutation replay unless a real queue is introduced later;
- Open Video may still launch an external source if the device/platform can do so.

## 33. Canonical Exact Duplicate Flow

### Exact Duplicate Detected

1. Canonical identity matches an existing owner Video.
2. Server does not create another Video.
3. UI shows:

> Already in your library.

4. Primary action:

```text
Open Existing
```

5. `Keep Capture in Inbox` appears only when the current raw capture contains useful unsaved context.
6. Back/Cancel leaves the existing Video unchanged.

Rules:

- provider identity uses owner + platform + external ID when known;
- generic identity uses owner + canonical URL;
- Inbox conversion retry returning `convertedNodeId` is idempotent, not a new duplicate;
- MVP does not block fuzzy or semantic near-duplicates.

## 34. Destructive Action and Undo Policy

```text
High-impact object delete
  -> confirmation

Archive Inbox item
  -> immediate + Undo where safe

Discard durable native capture
  -> explicit destructive action; confirm when accidental loss is plausible

Remove relationship
  -> immediate + Undo where safe

Delete lightweight Note
  -> immediate + Undo where safe

Revoke active share link
  -> confirmation
```

Copy must use the exact operation name. `Archive`, `Delete`, `Discard Capture`, and `Revoke` are not interchangeable.

## 35. Global Mobile Interaction Behavior

### Bottom Navigation and Quick Add

```text
Home | Inbox | Library | Search | More
```

`Add Video`:

- contextual floating quick action on Home, Inbox, and Library;
- hidden on keyboard-heavy forms and screens with competing sticky primary actions;
- remains above bottom navigation and safe-area inset;
- never covers the final actionable list item.

### Software Keyboard

- focused field remains visible;
- sticky CTA remains reachable;
- bottom navigation may temporarily hide on keyboard-heavy forms;
- URL input uses URL-appropriate input behavior;
- Search/Enter submits Search;
- multiline Note Return inserts a new line;
- first invalid field scrolls into view.

### Long Lists

- deterministic incremental pagination;
- explicit accessible `Load more` path;
- pagination loading and retry states;
- practical scroll restoration after opening a detail page and returning.

### Sheets Versus Full Screen

```text
Up to 3 lightweight fields -> sheet may be used
Long text / keyboard-heavy -> prefer full screen
Nested search/selection -> prefer full screen on small phones
Multi-step task -> full screen
```

### Screen-State Contract

Major data screens define as applicable:

```text
Initial
Loading
Loaded
Empty
Filtered empty
Refreshing
Offline unavailable
Recoverable error
Authentication error
Deleted/unavailable
Pagination loading
Pagination error
```
