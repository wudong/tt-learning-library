# Interaction Design System

This document records the approved user-facing interaction patterns for TT Learn. Product code should use these patterns instead of browser-native dialogs or one-off overlay implementations.

## Core principles

1. **Keep semantic HTML.** Inputs, buttons, selects, textareas, headings, lists, and links remain the underlying controls.
2. **Use one visual language.** Primary, secondary, destructive, neutral, warning, success, and error states should look and behave consistently.
3. **Design for a phone first.** Controls use reachable layouts, 44px-or-larger touch targets, safe-area spacing, and bottom sheets where a full-width mobile surface improves selection.
4. **Preserve context and progress.** Closing a selector or collapsing an editor must not silently discard entered data.
5. **Make consequential actions explicit.** Destructive actions require a labelled design-system confirmation. Reversible organization actions should prefer immediate feedback with Undo.
6. **Separate reading from management.** Default detail pages prioritize learning content. Occasional upload, delete, and configuration tools belong behind explicit management actions or focused routes.

## Approved patterns

### Dialog and bottom sheet

Use `Dialog` from `apps/web/src/components/Dialog.tsx`.

- `variant="dialog"` is appropriate for concise confirmation and information.
- `variant="sheet"` is appropriate for mobile selection, forms, and longer content.
- The component owns modal semantics, Escape handling, focus trapping, body-scroll locking, and focus restoration.
- The title is always programmatically associated with the dialog.
- Scrim and close-button labels describe the action.

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

Use a `Dialog` sheet containing semantic buttons, search input when useful, and clear selected state.

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
- Use `.notice` banners for persistent neutral, warning, or connectivity information.
- Loading and empty states should explain what is happening and, when appropriate, offer the next action.

## Control hierarchy

- `.button`: primary action.
- `.button.secondary`: alternative, cancel, or non-dominant action.
- `.button.danger`: destructive action.
- `.choice-trigger`: opens a design-system selector.
- `.choice-option`: semantic selectable row within a sheet.
- `.catalog-manage-action`: labelled secondary management action on catalog cards.

Icon-only actions are reserved for universally understood compact controls such as close, pin, move, and delete, and they require an accessible label. Navigation and editing should not be represented by competing unlabeled icons.

## Current implementations

- Inbox archive with Undo and organize Topic/Skill sheets.
- Topic management and Drill creation sheets.
- Topic read-only picture gallery with a dedicated picture-management route.
- Note composer, picture removal, and Feedback sheet.
- Training recent-plan entry, Topic/Skill sheets, progressive block editing, plan review, finish sheet, remaining-plan editor, and delete confirmation.

## Enforcement

`tests/interactionSystemContracts.test.ts` scans the web source for browser-native `alert`, `confirm`, and global `prompt` calls and protects the core dialog, Inbox, Training, catalog, and Topic picture-management contracts. The documented PWA installation API exception is deliberately excluded from that scan.
