# Training Profiles and Coach-Managed Training

## Scope

Training profiles exist only inside the Training feature. They do not change ownership or visibility for Library content, videos, Topics, Skills, Drills, notes, Inbox items, or share links.

A signed-in user remains the sole owner of every profile and every training record. A player profile is a private label that lets a coach separate plans, live sessions, manual logs, check-ins, and insights by player.

## Privacy model

A profile stores only:

- a display name or nickname
- whether it is the account owner's personal profile
- ownership and audit timestamps

Profiles do not store email addresses, dates of birth, contact details, credentials, or public identifiers. They cannot sign in and they cannot access the coach's Library.

All profile and session queries are scoped by the authenticated `user_id`. Supplying another user's profile ID returns `NOT_FOUND` rather than revealing whether the profile exists.

## Data model

`training_profiles`

- `id`
- `user_id`
- `display_name`
- `profile_type`: `self` or `player`
- timestamps and soft-delete marker

`practice_sessions.profile_id`

- links a training session to one profile
- remains nullable for backward compatibility with code or historical rows created before profile support
- a null profile is interpreted as the owner's `self` profile

Blocks and skill check-ins inherit the profile through their parent session. This avoids duplicated ownership columns and prevents profile/session disagreement.

## Backward compatibility

Migration `015_training_profiles` creates one `self` profile for every existing user and backfills existing sessions.

The API also lazily creates the self profile when necessary. Requests that omit `profileId` continue to operate on personal training, so existing clients and flows remain valid.

## API

- `GET /api/training/profiles`
- `POST /api/training/profiles`
- `PATCH /api/training/profiles/:id`
- `DELETE /api/training/profiles/:id`
- `GET /api/training/sessions?from=...&to=...&profileId=...`
- `GET /api/training/insights?from=...&to=...&profileId=...`
- `POST /api/training/sessions` with optional `profileId`

Deleting the personal profile is forbidden. Deleting a player profile with training history is also forbidden; the coach must remove those sessions explicitly first, preventing silent history loss.

## User flow

The Training hub contains an active-player switcher. The selection is stored locally on the device and is included in session, recent-plan, and insight requests.

A coach can:

1. add a player using a nickname or display name
2. switch the active player
3. plan, quick-start, or manually log training
4. review only that player's calendar and insights
5. rename a profile
6. remove an unused player profile

Opening an existing session remains owner-scoped and shows the profile attached to that session through the API response.

## Verification

Integration coverage verifies:

- automatic personal-profile creation
- default personal behavior when no profile is supplied
- independent player calendars and insights
- cross-owner profile rejection
- legacy null-profile sessions appearing under personal training
- prevention of deleting a profile that owns training history
- preservation of the existing training timer and manual-log tests
