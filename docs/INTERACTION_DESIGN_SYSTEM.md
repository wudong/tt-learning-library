# Interaction Design System

TT Learn consumes the shared TT design system published from `wudong/tt-players`. The external package is `@wudong/tt-players-design-system`; it is the single source of truth for TT brand tokens, shared controls, surfaces, overlays, states, and responsive interaction primitives.

Product code should compose those primitives with TT Learn feature layouts instead of creating a second local component library or brand layer.

## Package boundary

- Import shared components from `@wudong/tt-players-design-system`.
- Import `@wudong/tt-players-design-system/styles.css` exactly once in `apps/web/src/main.tsx`.
- `apps/web/src/tt-design-system.css` is a compatibility boundary only. It aliases historical TT Learn variable names to shared TT tokens while existing feature CSS is simplified; it must not define new brand colors, radii, shadows, or generic components.
- Product-specific CSS remains appropriate for knowledge graphs, media, training calendars, picture management, and other feature geometry that the shared package should not own.
- New reusable branded UI belongs in `tt-players/packages/design-system`, is released there, and is then consumed here by package version.

## Local development and CI

GitHub Packages requires authentication for npm-package installs. Configure `NODE_AUTH_TOKEN` with a GitHub token that has `read:packages`; `.npmrc` scopes only `@wudong` to GitHub Packages.

GitHub Actions uses the repository `GITHUB_TOKEN` with `packages: read`. Production API deployment installs only backend workspaces on the VPS, so the frontend package token is not copied to the server.

## Core principles

1. **Use the shared semantic API.** Prefer `AppButton`, `BottomSheet`, `AppDrawer`, `Surface`, `PageSection`, `List`, states, search controls, and other TT wrappers before low-level primitives or local implementations.
2. **Keep semantic HTML.** Inputs, buttons, headings, lists, and links retain the correct underlying semantics.
3. **Use one visual language.** Color, typography hierarchy, radii, spacing, focus rings, motion, surfaces, and control states come from shared TT tokens.
4. **Design for a phone first.** Controls use reachable layouts, 44px-or-larger touch targets, safe-area spacing, and shared sheets/drawers.
5. **Preserve context and progress.** Closing a selector or collapsing an editor must not silently discard entered data.
6. **Make consequential actions explicit.** Destructive actions require a labelled shared confirmation surface. Reversible organization actions should prefer immediate feedback with Undo.
7. **Separate reading from management.** Default detail pages prioritize learning content. Occasional upload, delete, and configuration tools belong behind explicit management actions or focused routes.

## Approved patterns

### Dialog and bottom sheet

Use `Dialog` / `ConfirmDialog` from `apps/web/src/components/Dialog.tsx` for TT Learn flows. They are thin product adapters over the shared `BottomSheet` component; Radix in the shared package owns focus trapping, inert background behaviour, Escape handling, scroll locking, and focus restoration.

For new generic overlay needs, use shared `BottomSheet` or `AppDrawer` directly instead of adding local portal/focus implementations.

### Destructive confirmation

Use `ConfirmDialog`.

- State the object and consequence clearly.
- Use a neutral **Cancel** action and a specific destructive label such as **Remove session** or **Discard capture**.
- Never call browser `alert`, `confirm`, or global `prompt` for product interactions.
- Do not add a confirmation to reversible, low-risk actions merely to slow the user down.

### Explicit platform exception

`BeforeInstallPromptEvent.prompt()` in `PwaProvider` is the standards-based browser API required to display the user-requested PWA installation surface. It is not a product alert/prompt implementation and is permitted only for that installation trigger. Product flows must not introduce other native prompt APIs.

### Reversible organization action

Archive and similar low-risk state changes should happen immediately and use a success toast with **Undo**.

- The server state remains durable.
- The active list updates immediately.
- Undo restores the previous status through the same API contract.
- Failure is reported through an error toast.

### Selection sheet

Use the shared sheet adapter containing semantic buttons, a search control when useful, and clear selected state.

- Show the current Topic or other filtering context in the eyebrow/title.
- Use `aria-pressed` for multi-select options.
- Include a visible selected count when the sheet allows multiple choices.
- Provide an explicit empty state when no options match.

### Progressive editor

Long mobile forms should expose one active editor at a time.

- Completed choices collapse into summaries.
- A summary includes the object name, key configured values, and an Edit/open affordance.
- Reopening a summary preserves all entered values.
- Adding the next object collapses the previous editor automatically.

### Read-only detail and focused management

When an object has optional supporting media or configuration:

- The normal detail route shows compact read-only content only when it exists.
- Empty supporting sections do not occupy permanent page space.
- A subtle labelled **Add** or **Manage** action opens a focused management route.
- The management route owns upload, paste, review, and destructive controls.
- Returning to the detail route uses shared query caching so saved changes appear without a separate backend projection.

### Feedback and validation

- Use Sonner toasts for short success/error feedback after an action.
- Use inline validation for field-specific problems.
- Prefer shared `EmptyState`, `ErrorState`, `Surface`, and `PageSection` for reusable state/surface semantics.
- Loading and empty states should explain what is happening and, when appropriate, offer the next action.

## Control hierarchy

- `AppButton` `tone="primary"`: primary action.
- `AppButton` `tone="outline"`: alternative, cancel, or non-dominant action.
- `AppButton` `tone="danger"`: destructive action.
- `AppButton` `tone="ghost"`: low-emphasis compact action.
- Product-specific selectable rows may retain semantic classes where their geometry is feature-specific, but their colors, borders, focus, and radius must resolve through shared TT tokens.

`.button` remains only as a compatibility bridge for existing feature markup. Do not add new `.button` usage; migrate touched actions to `AppButton`.

Icon-only actions are reserved for universally understood compact controls such as close, pin, move, and delete, and they require an accessible label. Navigation and editing should not be represented by competing unlabeled icons.

## Enforcement

`tests/interactionSystemContracts.test.ts` scans the web source for browser-native `alert`, `confirm`, and global `prompt` calls and verifies that the product dialog adapter delegates modal behaviour to the published design system. `tests/designSystemMigration.test.ts` protects the package import, registry, Tailwind integration, token bridge, and the rule that TT Learn does not grow a second local generic UI package.
