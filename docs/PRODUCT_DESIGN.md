# PRODUCT_DESIGN.md — Product and UX Design Guide

> Product design revision: 2.1  
> Reviewed: 2026-07-04

## 1. Purpose

This document defines the user-facing design target for Table Tennis Learning Library.

It complements:

- `PRD.md` for scope;
- `TECH.md` for architecture;
- `DATA_MODEL.md` for graph-backed persistence;
- `API_CONTRACT.md` for API behavior;
- `UX_FLOWS.md` for exact flows.

## 2. Product Design Summary

The app should feel like:

> A fast mobile learning notebook for table tennis videos, with a knowledge graph quietly powering the structure.

It should not feel like:

- a generic bookmark manager;
- a heavy CMS;
- a social media app;
- a graph database console;
- a generic note app;
- an AI-first product.

Desired qualities:

```text
clear
practical
focused
coach-like
lightweight
mobile-friendly
learning-oriented
```

## 3. Core User Mental Model

Visible model:

```text
Capture -> Inbox -> Organize -> Learn -> Practice -> Revisit -> Share
```

Visible objects:

```text
Videos
Topics
Skills
Notes
Timestamp Notes
Drills
Mistakes
Learning Paths
```

Hidden implementation model:

```text
First-class object = graph node
Meaningful relationship = typed graph edge
```

Never expose `graph_nodes`, `graph_edges`, or edge-type implementation language in normal UI.

## 4. Information Architecture

### 4.1 Primary Mobile Navigation

```text
Home | Inbox | Library | Search | More
```

Use a prominent quick-add action for:

```text
Add Video
```

Phone placement:

- show a contextual floating quick action on Home, Inbox, and Library;
- hide it on keyboard-heavy forms and when a sticky primary action is present;
- position it above bottom navigation and bottom safe-area inset;
- ensure it never covers the final actionable list item.

### 4.2 Library Navigation

Lead with learning structure:

```text
Topics
Skills
Videos
Drills
Paths
```

Do not lead with generic folders.

### 4.3 Desktop Enhancement

Desktop may use:

- left sidebar;
- wider detail pane;
- list/detail split;
- richer related-item layout.

Core workflows must not require desktop.

### 4.4 Mobile Interaction Contract

The phone experience is the baseline.

Supported layout targets:

```text
Minimum narrow reflow target: 320 CSS px
Primary phone design target: 360–390 CSS px
Large phone target: 412–430 CSS px
Tablet: progressive enhancement
Desktop: progressive enhancement
```

Rules:

- core flows use one column on phones;
- no critical action depends on hover;
- content must not require horizontal page scrolling at the narrow target except for genuinely two-dimensional content that is explicitly exempted;
- portrait is primary, but landscape remains functional;
- no non-essential workflow requires a specific orientation.

Safe areas:

- top bars respect `env(safe-area-inset-top)` when applicable;
- bottom navigation and sticky actions respect `env(safe-area-inset-bottom)`;
- important controls must not overlap system gesture regions, cutouts, or rounded-corner clipping;
- stacked sticky UI must reserve content padding so the final item remains reachable.

Software keyboard:

- the focused field remains visible;
- sticky primary actions must not be hidden behind the keyboard;
- keyboard-heavy screens may temporarily hide the bottom navigation when necessary;
- URL fields request an appropriate URL keyboard/input mode;
- Search uses the platform Search/Enter action;
- multiline notes preserve Return for new lines;
- validation scrolls the first invalid field into view and moves focus appropriately.

One-handed use:

- frequent primary actions should be placed in lower or middle reachable zones where practical;
- destructive and low-frequency actions must not compete with the primary thumb-zone action;
- critical phone controls use a minimum 44 × 44 CSS px interactive hit area;
- primary buttons should generally be at least 48 CSS px high;
- visually smaller icons are allowed only when their hit container meets the target.

Density:

- one visually dominant primary action per state;
- no more than two direct card actions; additional actions move to an overflow menu;
- compact cards prioritize title, type/source, progress/state, and one useful count;
- secondary metadata collapses before touch targets or text legibility are reduced.

### 4.5 Adaptive Layout Strategy

```text
Phone
  -> single pane

Wide phone / small tablet
  -> single pane with controlled content width

Tablet
  -> optional list/detail split for Library and Search

Desktop
  -> sidebar + optional list/detail split
```

Layout adaptation must preserve route semantics, back behavior, focus order, and the same product hierarchy.

### 4.6 Mobile Environment Verification Matrix

Every release records exact OS, browser, install mode, and device/viewport for tested combinations.

Minimum matrix categories:

| Target category | Browser mode | Installed/standalone mode | Core flows | Native receive-share |
|---|---|---|---|---|
| iPhone-class phone | Required | Verify | Required | Verify; never assume |
| Android-class phone | Required | Verify | Required | Verify on at least one named combination |
| 320 CSS px narrow target | Required | Optional | Required | Not a layout requirement |
| 412–430 CSS px large phone | Required | Optional | Required | Verify where claimed |
| Desktop fallback | Required | Optional | Core manual flows | Secondary |

Manual paste is required in every environment. Native receive-share availability is capability-tested per release and must not be inferred from screen size alone.

## 5. Navigation and State Rules

- Selected filters should be visible.
- Search/filter state should use URL params where practical.
- Back navigation must preserve list/filter context and practical scroll position.
- A route change caused by sign-in recovery should return to the intended safe destination.
- Unsaved form state should not be destroyed by forced service-worker reloads.
- When the software keyboard is open, navigation chrome must not obscure the focused field or sticky primary action.
- Deleted items should disappear from normal navigation.
- Public shared views must not link into private owner routes.

## 6. Key Screens

### 6.1 Authentication and Session Recovery

Hosted mode states:

```text
Sign in
Signing in
Sign-in failed
Session expired
Retry protected action
Signed out
```

Rules:

- preserve intended destination where safe;
- preserve an in-progress local form draft when a write fails because the session expired;
- after successful sign-in, retry only after explicit user action unless the original operation is provably idempotent and the UX states that it is resuming;
- sign-out clears private client caches before showing a non-private route;
- unauthenticated native share capture must not create ownerless private data.

### 6.2 Home

Purpose: return the user to learning quickly.

Sections:

- Quick Add;
- Inbox count;
- Continue Learning;
- Recently Saved;
- Skills Being Practiced;
- optional starter topics for empty libraries.

Primary actions:

```text
Add Video
Open Inbox
Browse Skills
```

`Continue Learning` ranking:

```text
1. incomplete Learning Path item, when Paths are enabled
2. Video progress = Watching
3. Video learning state = Revisit
4. Skill status = Practicing
```

Rules:

- maximum 5 items;
- within a priority group, most recently interacted item comes first;
- skip empty groups;
- do not fabricate recommendations from arbitrary graph proximity.

Empty state:

> Start by saving a table tennis tutorial. Paste a link, or install the app and share supported links directly into your Inbox.

### 6.3 Quick Save

Two modes are visually related but have different persistence semantics.

**Manual Add**

Fields:

```text
URL required
Title optional
```

Actions:

```text
Save to Inbox
Organize Now
Cancel
```

**Native Share Receipt**

The Inbox item already exists before this screen opens.

States/actions:

```text
Saved to Inbox
Done
Organize Now
Discard Capture
```

When URL correction is required, show the editable URL field and explain that the capture is saved but no Video has been created yet.

Optional organization fields appear only after `Organize Now`:

```text
Topics
Skills
Tags
Quick note
Video progress
Video learning state
```

Design rules:

> The fastest successful capture must not require classification.

> Never show `Save to Inbox` after the server has already created the Inbox item.

### 6.4 Share-Target Receiving State

The server handles the native POST at `/share-target` and redirects to `/quick-save/:inboxItemId`. The Quick Save route must show clear progress/result states. A GET `/share-target` compatibility route may show test/manual parsing states.

States:

```text
Receiving shared item
Saved to Inbox
Needs URL correction
Authentication required
Capture failed
```

Actions after successful durable capture:

```text
Done
Organize Now
Discard Capture
```

Never expose raw form/query payloads in UI. `Cancel` is not used for an already-persisted capture because its effect would be ambiguous.

### 6.5 Inbox

Card content:

- title or detected URL;
- source platform;
- capture time;
- status;
- duplicate/existing indicator where relevant.

Actions:

```text
Organize
Archive
```

Empty state:

> Your Inbox is clear. Share a table tennis video into the app or paste a link to capture something new.

### 6.6 Organize Inbox Item

Fields:

```text
Title
URL
Topics
Skills
Tags
Quick note
Video progress
Video learning state
```

Actions:

```text
Save as Video
Archive
Delete
```

Behavior:

- conversion retry must not create duplicates;
- successful conversion routes to video detail;
- existing duplicate may route to existing video with a clear message.

### 6.7 Library

Tabs/sections:

```text
Topics
Skills
Videos
Drills
Paths
```

Lead cards with meaningful learning information:

Skill card:

```text
Reverse Pendulum Serve
Serve
Practicing
3 videos • 2 drills
```

Video card:

```text
Reverse Pendulum Serve Tutorial
YouTube
Watched • Revisit
2 notes
```

### 6.8 Video Detail

Phone hierarchy:

```text
Top app bar
Title + source
Video progress + learning state
Primary action: Open Video
Quick actions: Note | Timestamp | Drill | More
Learning context: Skills | Topics | Tags
Notes
Timestamp Notes
Practice: Drills
Related Items
Learning Paths
```

Header content:

- title;
- thumbnail when available without delaying primary content;
- source badge;
- Open Video;
- video progress;
- video learning state;
- Share in overflow or header only when enabled by policy.

Actions:

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

Phone rules:

- `Open Video` is the dominant primary action;
- no more than four compact quick actions are shown directly;
- Edit/Delete and other low-frequency actions use More;
- returning from an external source restores the same detail route and practical scroll context;
- timestamp notes sort chronologically.

### 6.9 Skill Detail

The skill page is a primary learning surface, not a folder.

Header:

- skill name;
- primary topic;
- difficulty;
- status;
- Share.

Sections:

```text
Overview
Linked Videos
Key Notes
Common Mistakes
Drills
Related Skills
Prerequisites
Learning Paths
```

Actions:

```text
Add Video
Add Note
Add Mistake
Create Drill
Link Skill
Share
Edit
```

### 6.10 Topic Detail

Sections:

```text
Child Topics
Skills
Videos
Notes
Drills
Related Topics
```

Hierarchy should be understandable without exposing graph terminology.

Creation rules:

- seed Topics are protected from hard deletion;
- user-created Topics are managed from explicit Topic management;
- fast capture may create a Skill inline but does not create Topics inline;
- helper copy distinguishes a broad Topic from a specific Skill.

### 6.11 Note Detail/Edit

Fields:

```text
Body
Type
Timestamp when applicable
Primary parent
Related mentions
```

Notes should be lightweight.

Phone behavior:

- short note forms may use a sheet;
- long or keyboard-heavy editing uses a full-screen route;
- deletion uses immediate feedback with Undo where technically safe;
- unsaved text remains present after recoverable network or session errors.

### 6.12 Mistake Detail/Edit

Mistakes are reusable learning objects linked primarily to Skills.

Fields:

```text
Title required
Description optional
Correction optional
Linked skills
```

Actions:

```text
Edit
Link Skill
Unlink Skill
Delete
```

Rules:

- starting from a Skill preselects that Skill;
- unlinking does not delete the Mistake;
- deleting follows the global destructive-action policy;
- Mistakes are not independently shareable in MVP.

### 6.13 Drill Detail

Fields:

```text
Title
Description
Instructions
Difficulty
Duration
Repetition target
Status
Linked skills/videos
```

Actions:

```text
Edit
Mark Practicing
Mark Done
Link Item
Share
```

### 6.14 Learning Path

Sections:

- path title/description/status;
- ordered item list;
- completion state;
- progress summary.

Interactions:

- add existing object;
- reorder;
- mark complete;
- remove.

Mobile reorder must have accessible alternatives to drag-and-drop.

### 6.15 Search

Layout:

- sticky search field where useful;
- clear typed results;
- filter sheet on mobile;
- explicit `Clear` affordance.

Query behavior:

- before the first query, show a neutral search prompt rather than an empty-error state;
- begin automatic search at 2 non-whitespace characters with approximately 250 ms debounce;
- Search/Enter submits immediately;
- MVP stores no server-side recent-search history;
- filter sheet uses `Apply` and `Clear all` so multiple changes do not cause repeated screen churn;
- query, filters, practical scroll position, and pagination position are restored on Back.

States:

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

Filters:

```text
Object type
Topic
Skill
Video progress
Video learning state
Skill status
Source platform
```

Do not show unrelated private or deleted results.

### 6.16 Shared Read-Only View

Public view must be visually separate from the private app shell.

Show:

- object title;
- allowlisted content projection for that target type;
- only relationship previews explicitly allowlisted for that target type;
- source link where appropriate.

Do not show:

- owner email;
- private navigation;
- arbitrary graph neighbors;
- private notes outside the explicit projection;
- edit controls.

Expired/revoked/deleted share:

> This shared item is no longer available.

## 7. Long Lists, Scrolling, and Refresh

For Inbox, Library, Search, and relationship pickers:

- use deterministic incremental pagination;
- prefer an explicit accessible `Load more` control in MVP rather than mandatory infinite scroll;
- show loading, end-of-list, and pagination-retry states;
- preserve practical scroll position when returning from detail;
- reserve space for floating/sticky UI so the last item remains reachable;
- pull-to-refresh is not required for MVP and must not be the only refresh method.

Sort rules must be visible and stable. Default sorts:

```text
Inbox: newest capture first
Videos: recently updated first
Skills: recently updated first
Search: deterministic relevance/order from SearchProvider
Timestamp Notes: chronological
```

## 8. Sheets, Dialogs, and Full-Screen Forms

Decision rule:

```text
Up to 3 lightweight fields -> sheet may be used
Long text or keyboard-heavy editing -> prefer full screen
Nested search/selection -> prefer full screen on small phones
Multi-step task -> full screen
Destructive confirmation -> dialog only when confirmation is warranted
```

Rules:

- opening a modal sheet/dialog moves focus appropriately;
- closing restores focus to the invoking control when it still exists;
- Escape/back behavior is predictable;
- a sheet with unsaved changes asks before destructive dismissal only when meaningful data would be lost;
- drag gestures are never the sole way to dismiss a critical in-progress form.

## 9. Graph UX

Graph behavior should appear as ordinary product concepts:

```text
Related skills
Prerequisites
Videos explaining this skill
Drills for this skill
Common mistakes
Part of these learning paths
```

MVP should not include a force-directed graph visualization.

Relationship creation UI:

1. choose relationship meaning;
2. choose target object;
3. review;
4. save.

Only valid relationship options should be shown for the selected source object type.

## 10. Sharing Design

### 10.1 Default

No object is public merely because it exists.

Default:

```text
Private
```

### 10.2 Shareability Matrix

| Object | MVP shareable | Public related preview rule |
|---|---:|---|
| Video | Yes | Only explicitly allowlisted safe previews. |
| Skill | Yes | Only explicitly allowlisted safe previews. |
| Drill | Yes | Only explicitly allowlisted safe previews. |
| Learning Path | Late MVP | Only safe projections of included items. |
| Topic | No | — |
| Note | No | — |
| Mistake | No | May appear only inside an allowlisted Skill projection. |
| Collection | No | Post-MVP. |

### 10.3 Share Action

Share sheet:

```text
Anyone with this link can view the shared item.
They cannot access the rest of your private library.

Create unlisted link
Expiry: Never | 1 day | 7 days | 30 days | Custom
Create link
```

After creation:

```text
Copy Link
Open Shared View
Revoke Link
```

Do not imply that revocation deletes the underlying object.

### 10.4 Existing Links

Settings/More may list:

- object title;
- token prefix only;
- created time;
- expiry;
- revoked state.

Never display persisted raw tokens because raw tokens are not stored.

## 11. Status Design

### 11.1 Video Progress

```text
Saved
Watching
Watched
```

### 11.2 Video Learning State

```text
None
Practicing
Revisit
Understood
```

A Video may be `Watched` and `Revisit` simultaneously.

### 11.3 Skill

```text
Not Started
Learning
Practicing
Improving
Comfortable
```

### 11.4 Drill

```text
Planned
Practicing
Done
Archived
```

Status colors must not be the only way status is communicated. List cards may combine dimensions compactly, for example `Watched • Revisit`, while edit controls keep them separate.

## 12. Table Tennis Taxonomy Design

Seed topics:

```text
Serve
Receive
Spin
Forehand
Backhand
Footwork
Tactics
Match Analysis
Physical Training
Mental Game
Equipment
```

Seed taxonomy is a starting point.

Rules:

- users can add Skills;
- users create Topics only through explicit Topic management;
- seed Topics are protected from hard deletion;
- primary Topic is visible;
- additional relationships can grow organically;
- avoid forcing every Video into a single folder.

Creation helper copy:

```text
Topic
A broad area such as Serve, Footwork, or Tactics.

Skill
A specific ability you want to learn or improve.
```

Difficulty scale for Skills and Drills:

```text
Unspecified
Beginner
Intermediate
Advanced
```

Difficulty describes object complexity, not the user's value or rank.

## 13. Mobile Component Patterns

Prefer:

- bottom navigation;
- full-width cards;
- drawers/sheets for secondary forms;
- sticky primary actions when helpful;
- large touch targets;
- filter chips;
- progressive disclosure;
- one-column core flows.

Avoid:

- dense data tables;
- hover-only actions;
- tiny icon-only critical controls;
- mandatory drag-and-drop.

Required component-state coverage:

```text
default
pressed
focus-visible
disabled
loading
error
selected
```

At minimum define these components:

```text
Button
Icon Button
Text Input
URL Input
Textarea
Search Input
Chip
Filter Chip
Status Selector
Card
List Row
Bottom Navigation
Top App Bar
Bottom Sheet
Dialog
Toast/Snackbar
Inline Alert
Skeleton
Empty State
Thumbnail
Tag Picker
Skill Picker
Topic Picker
```

## 14. Loading, Error, and Empty States

### Required Screen-State Model

Every major data screen defines, where applicable:

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

### Loading

Use:

- skeletons for list/detail where layout is predictable;
- explicit progress for capture conversion;
- disable duplicate submit while preserving idempotent server behavior;
- hide decorative skeleton structure from assistive technology and expose one meaningful loading status.

### Error

Errors must be actionable.

Examples:

> We couldn't find a valid video link in the shared text. Edit the URL and try again.

> This item was already organized. Opening the existing video.

> That shared link has expired or been revoked.

### Mobile Performance Acceptance

For critical phone flows:

- tap feedback appears immediately even when network completion is pending;
- save actions show a clear pending state without changing unsaved data to a false saved state;
- thumbnails reserve dimensions to avoid disruptive layout shift;
- Home, Inbox, Library, and Search remain responsive with long lists through pagination;
- skeletons approximate final layout rather than causing major jumps;
- critical-path testing includes slow/intermittent network and at least one mid-range Android-class device or equivalent performance profile.

Exact numerical budgets may live in the implementation plan, but release testing must record observed regressions.

### Offline

For private mutations:

> You're offline. Reconnect to save changes.

MVP does not promise private offline reads because private API JSON is NetworkOnly. An already-rendered screen may remain visible in memory, but navigation that requires private API data shows an honest offline-unavailable state.

Do not pretend a mutation was queued unless an offline mutation queue actually exists.

## 15. Accessibility

Target:

```text
WCAG 2.2 Level AA for the mobile-first PWA
```

Minimum product requirements:

- semantic landmarks and logical heading structure;
- visible focus that is not obscured by sticky UI;
- keyboard-operable controls;
- accessible names for icon buttons;
- critical phone controls use a minimum 44 × 44 CSS px project hit area;
- no color-only status or error meaning;
- text and non-text contrast meet the target;
- 200% zoom and narrow reflow remain usable;
- orientation is not restricted unless essential;
- reduced-motion preference is respected;
- dialogs/sheets manage focus and restore it on close;
- reorder alternatives include Move Up, Move Down, and Move to Position;
- form errors are linked to fields and the first invalid field is reachable;
- asynchronous save, failure, result-count, and status changes are announced appropriately;
- loading skeletons do not create noisy assistive-technology output.

Critical-flow acceptance testing includes:

```text
VoiceOver on an iPhone-class target
TalkBack on an Android-class target
Keyboard-only browser navigation
200% zoom / narrow reflow
Reduced motion
Large text scaling where supported
```

## 16. Design System Foundations

The implementation may use generated component primitives, but the product must define semantic design tokens.

### 16.1 Typography

Define tokens for:

```text
Display/hero
Page title
Section heading
Body
Body strong
Supporting text
Label
Caption
Numeric/time
```

Rules:

- body text must remain legible on a 320 CSS px layout;
- do not solve density by shrinking essential text;
- long notes prioritize reading line length and line height over card compactness.

### 16.2 Color

Define semantic tokens rather than screen-specific hex values:

```text
background
surface
surface-raised
text-primary
text-secondary
border
primary
danger
warning
success
focus
```

Also define tokenized status treatment. Dark mode is not required for MVP unless explicitly scheduled; if omitted, do not ship an incomplete theme toggle.

### 16.3 Spacing and Shape

Recommended base spacing scale:

```text
4 8 12 16 20 24 32 40 48
```

Define product tokens for:

```text
card radius
button radius
chip radius
sheet radius
divider
elevation
```

### 16.4 Motion

- motion supports orientation and feedback, not decoration;
- respect reduced motion;
- avoid large parallax and long blocking transitions;
- loading and save feedback must not depend on animation alone.

## 17. Destructive Actions and Undo

Global policy:

```text
High-impact object delete
  -> confirmation

Archive Inbox item
  -> immediate action + Undo where safe

Remove graph relationship
  -> immediate action + Undo where safe

Delete lightweight Note
  -> immediate action + Undo where safe

Revoke active share link
  -> confirmation
```

Confirmation copy states the actual consequence. `Archive`, `Delete`, `Discard Capture`, and `Revoke Link` are never used interchangeably.

## 18. Privacy UX

- Make private default clear.
- Do not display raw share tokens in link-management lists.
- Before unlisted link creation, state plainly that anyone with the link can view the shared item and cannot browse the rest of the private library.
- Revocation must be easy.
- Never show raw capture payloads by default.
- Avoid analytics that collect note bodies or shared text.

## 19. Design Non-Goals for MVP

Do not design:

- community feed;
- followers;
- reactions;
- complex graph canvas;
- AI chat coach;
- dense desktop dashboard as the primary experience;
- full offline editor;
- collaboration presence;
- collections of mixed learning objects.
