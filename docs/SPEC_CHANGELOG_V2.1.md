# Table Tennis Learning Library — Spec Update Summary

> Update: v2.1  
> Date: 2026-07-04  
> Scope: coordinated mobile-first UI/UX and product-spec correction

## Updated Files

- `PRD.md`
- `PRODUCT_DESIGN.md`
- `TECH.md`
- `UX_FLOWS.md`

## Major Decisions Resolved

1. **Native share capture uses durable Inbox-first semantics**
   - The server creates the Inbox item before the receipt screen.
   - The receipt screen says `Saved to Inbox`.
   - Actions are `Done`, `Organize Now`, and `Discard Capture`.
   - It no longer ambiguously asks the user to `Save to Inbox` after persistence.

2. **Collections are post-MVP**
   - Removed from the MVP visible object model, canonical routes, API family, implementation order, and shareability.
   - Retained only as a post-MVP concept.

3. **One canonical exact-duplicate policy**
   - Exact duplicates do not create another Video.
   - UI shows `Already in your library`.
   - Primary action is `Open Existing`.
   - Conversion retries remain idempotent.
   - Fuzzy/semantic duplicate blocking is not MVP.

4. **Video tracking is split into two dimensions**
   - Progress: `saved | watching | watched`
   - Learning state: `none | practicing | revisit | understood`
   - A Video can therefore be `watched` and `revisit` at the same time.

5. **Explicit MVP shareability matrix**
   - Video: yes
   - Skill: yes
   - Drill: yes
   - Learning Path: late MVP, only when Paths ship
   - Topic: no
   - Note: no
   - Mistake: no as an independent target
   - Collection: no, post-MVP

6. **Hosted authentication UX is specified**
   - Sign-in and intended-destination recovery
   - Session expiry during editing
   - Draft preservation
   - Explicit retry behavior
   - Sign-out private-cache clearing
   - No ownerless native-share capture

7. **Mobile-first interaction contract is concrete**
   - 320 CSS px narrow-reflow target
   - 360–390 CSS px primary phone target
   - 412–430 CSS px large-phone target
   - Safe-area handling
   - Software-keyboard behavior
   - One-handed action placement
   - 44 × 44 CSS px critical hit-area rule
   - 48 CSS px preferred primary-button height
   - Portrait-primary, landscape-functional behavior
   - Tablet/desktop as progressive enhancement

8. **Mobile navigation behavior is resolved**
   - Bottom nav remains `Home | Inbox | Library | Search | More`
   - `Add Video` is a contextual floating quick action on Home, Inbox, and Library
   - Hidden where it conflicts with keyboard-heavy or sticky-primary-action screens

9. **Accessibility target is testable**
   - WCAG 2.2 Level AA target
   - VoiceOver and TalkBack smoke tests
   - Keyboard operation
   - Reduced motion
   - 200% zoom/narrow reflow
   - Accessible dialog/sheet focus handling
   - Async status announcements

10. **Missing object and lifecycle flows are added**
    - Skill create/edit/delete
    - Topic management
    - Tag management
    - Plain Note create/edit/delete
    - Mistake create/edit/link/unlink/delete
    - Drill edit/archive/delete
    - Relationship remove/change
    - Share-link management
    - User export
    - Offline behavior
    - PWA install/update

11. **Difficulty scale is resolved**
    - `unspecified | beginner | intermediate | advanced`
    - Describes object complexity, not user worth/rank

12. **Topic versus Skill creation policy is resolved**
    - Topic = broad learning area
    - Skill = specific capability
    - Seed Topics protected
    - User Topics created only through explicit Topic management
    - Fast capture may create Skills inline, not Topics

13. **Search behavior is implementation-ready**
    - Initial/typing/loading/results/filter-empty/error/offline states
    - Approximately 250 ms debounce after 2 non-whitespace characters
    - Search/Enter immediate submit
    - Mobile filter sheet with Apply/Clear all
    - Back restores query, filters, pagination, and practical scroll context
    - Accessible explicit `Load more` path

14. **Additional mobile UX gaps are closed**
    - Deterministic Home `Continue Learning` ranking
    - Timestamp-note edge cases
    - External Video return behavior
    - Destructive-action/Undo policy
    - Long-list behavior
    - Sheet versus full-screen rules
    - Mobile performance acceptance
    - Analytics event contract and forbidden properties
    - Junior hosted-account product policy

## Validation Performed

- All four documents are revision 2.1.
- Markdown code fences are balanced.
- No canonical MVP `/collections` route remains.
- No `/api/collections` family remains.
- All four documents use the same durable native-share actions.
- All four documents use the same post-MVP Collections decision.
- Shareability rules are aligned.
- Mobile baseline appears in all four documents.
- The legacy single Video-status model was removed.

## Important Scope Note

The four supplied files reference additional canonical documents such as:

- `DATA_MODEL.md`
- `API_CONTRACT.md`
- `IMPLEMENTATION_PLAN.md`
- `TASKS.md`
- `AGENTS.md`

Those files were not supplied and were not modified. Because v2.1 resolves product decisions that can affect schema and endpoint contracts—especially Video progress/state, exact-duplicate results, shareability, Mistake endpoints, and removal of MVP Collections—the referenced canonical documents should be reconciled before implementation is frozen.
