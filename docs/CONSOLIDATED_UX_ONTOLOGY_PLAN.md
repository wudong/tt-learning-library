# Consolidated Mobile UX and Ontology Plan

## Goal

Resolve the complete feedback round in one coherent change: simplify the Training and Library interfaces, eliminate duplicate actions and narrow-screen regressions, and make the knowledge graph useful through richer content and relationships.

## Workstreams

### 1. Training player context and calendar

- Keep the full calendar visible by default.
- Provide one persistent show/hide calendar control; remove compact calendar mode.
- Replace the separate player selector and management button with one drawer.
- Open the same drawer from the Training screen and the mobile toolbar.
- Show the current training profile in the toolbar.
- Keep calendars, plans, logs, sessions, and insights scoped to the selected profile.

### 2. Library simplification

- Keep the search field visible and remove the redundant toolbar search icon.
- Keep Topic visibility management in the toolbar and remove the duplicate page button.
- Remove explanatory copy that does not help the user act.
- Make each Topic row fully tappable with only a right-aligned chevron.
- Remove duplicated picture-management and note actions from detail sections.

### 3. Mobile layout reliability

- Repair the shared detail-heading grid bug that reduced descriptions to a one-word column after mobile headings were hidden.
- Constrain all route content to the viewport and prevent horizontal overflow.
- Preserve readable text width, touch targets, bottom-navigation clearance, and usable cards/forms at 320 px and 384 px.
- Capture and visually review every primary route at both target widths.

### 4. Ontology content quality

- Add reviewed descriptions for all 18 Topics.
- Replace formulaic Skill descriptions with specific guidance and meaningful topic-aware copy for all 176 Skills.
- Add detailed practice instructions to starter Drills.
- Add four missing starter Drills for backhand chop, opening against backspin, receive decisions, and ready-position recovery.
- Link each starter Drill to multiple supporting Skills rather than only one primary Skill.

### 5. Knowledge graph usefulness

- Add curated Topic-to-Topic and Skill-to-Skill relationships for prerequisites, requirements, enabling skills, related concepts, and contrasts.
- Backfill these relationships for existing users through idempotent ontology provisioning.
- Show both direct and two-hop neighbours, capped to remain readable.
- Group nearby paths by the intermediate item, expose type filters, and allow progressive exploration by recentering on a connected Topic, Skill, Drill, or Video.
- Continue including user-owned videos, notes, training sessions, and personal drills when they are linked.

## Acceptance criteria

- No duplicate search, Topic management, picture management, or note actions on the reviewed screens.
- Training uses one player drawer and no compact-calendar mode.
- Topic cards use a single right-aligned chevron and the entire row is tappable.
- Topic, Skill, Picture management, Drill, Connections, Video, Training, Inbox, Search, Home, and Settings pages remain readable at 320 px and 384 px.
- Backhand Chop exposes its Topic, foundations, spin concepts, defence relationship, contrasting attack, and a relevant starter Drill.
- Every Topic has substantial descriptive content; every Skill has non-formulaic guidance.
- Typecheck, lint, full tests, migrations, production build, PWA checks, and the expanded screenshot audit pass.
