# Mobile UI audit

This audit covers the signed-in PWA routes at phone widths, with the issue screenshots at 384px treated as the primary regression baseline and 320px as the minimum supported width.

## Product-wide rules

1. The sticky app toolbar is the only back-navigation row on detail pages.
2. A full page title must never share a layout row with a variable number of actions.
3. Page-level actions belong in the toolbar when they can be represented clearly as labelled icon buttons.
4. Relationship collections use a section heading plus flat, divider-separated rows. They do not place card-shaped rows inside another card.
5. Catalog entries have one dominant open target. Note, pin, and management controls are compact secondary actions.
6. Interactive controls have at least a 44px target, visible focus treatment, and an accessible name.
7. Long titles and metadata wrap without forcing horizontal scrolling.
8. Fixed navigation accounts for safe-area insets and content retains enough bottom padding to remain reachable.

## Route audit

| Area | Routes reviewed | Main risk | Resolution |
| --- | --- | --- | --- |
| App shell | All authenticated routes | Back button appeared on the trailing side; title could be squeezed by actions | Added a leading contextual back control, protected title column, and registered trailing page actions |
| Home | `/` | Dense cards and fixed bottom navigation | Existing hierarchy retained; shared narrow-width and safe-area rules applied |
| Inbox and capture | `/inbox`, `/inbox/:id`, `/quick-save/:id`, `/videos/new` | Duplicate navigation and keyboard-height pressure | Shared toolbar is authoritative; action sheets and forms retain scrollable bodies and safe-area footers |
| Library | `/library` | Duplicate in-content page heading; Manage action separated from Search | Mobile heading removed; Search and Manage Topics registered together in the toolbar |
| Topics, Skills, Drills catalog | Library tabs | Fragmented rows, detached counts, stacked actions, unbounded tags | Replaced all three variants with one reusable compact catalog card; tags are capped with `+N` overflow |
| Topic and Skill detail | `/library/topics/:id`, `/library/skills/:id` | Title/action collision, duplicate back row, nested relationship cards | Title isolated from responsive action bar; duplicate back removed; Skills and Drills rendered as flat rows |
| Drill detail | `/library/drills/:id` | Same collision and nested-card pattern | Uses the shared detail hierarchy and flat Skills practised section |
| Video detail | `/videos/:id` | Repeated title and action-card clutter | One page title, one primary media card, a compact graph action, and flat learning-context/related sections |
| Graph explorer | `/library/connections/:id` | Duplicate in-content back control | Uses the shared toolbar back control while retaining the accessible map/list switch |
| Training | `/training`, `/training/new`, `/training/:id`, `/training/:id/run` | Header/status wrapping, four-column summaries, action overflow | Shared mobile rules wrap headers, collapse summaries to two columns, and stack action groups where needed |
| Search | `/search` | Narrow result-row overflow | Shared min-width and wrapping rules apply to result content and controls |
| Settings | `/settings` | Repeated mobile heading and long account/build values | Existing desktop-only heading retained; long values wrap and sections remain flat |
| Public sharing and auth | `/s/:token`, login and auth handoff | Fixed navigation leaking into public/auth surfaces | These routes remain outside the authenticated app shell; existing standalone layouts retained |

## Automated regression coverage

`tests/mobileUiContracts.test.ts` protects the structural rules that caused the reported regressions:

- contextual shared back navigation;
- page-registered toolbar actions;
- one catalog card implementation across Topics, Skills, and Drills;
- bounded tag previews;
- no duplicate `back-link` rows on detail routes;
- no redundant `Open Skill` helper labels;
- explicit 384px and 320px breakpoints;
- touch-target, safe-area, and long-title rules.

The Quality workflow also starts the seeded app and captures mobile screenshots as a build artifact for the Library and representative Topic, Skill, and Drill detail routes at 384px and 320px.

## Visual verification matrix

Review the uploaded `mobile-ui-screenshots` artifact before merge.

| Viewport | Pages | Checks |
| --- | --- | --- |
| 384 × 900 | Library, Topic detail, Drill detail | No title/action overlap; no duplicate back row; cards scan compactly; flat relationship rows |
| 320 × 800 | Library, Skill detail | No horizontal scrolling; long titles wrap; toolbar actions remain reachable; bottom navigation does not cover content |
| Phone landscape | Library and active training session | Toolbar and bottom navigation remain usable; forms and timer actions remain reachable |
| Software keyboard open | Search, Add video, note composer, Drill skill search | Focused input remains visible; sheet/body scrolls independently; footer actions stay reachable |

## Deferred by design

This work does not add generic graph editing, public graph views, force-directed layout, or new standalone Note/Picture detail routes. Those remain outside the lightweight graph experiment described in issue #6.
