import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { InboxRepository, canonicalizeUrl, extractLikelyUrl } from '@ttll/db'
import type { CreateInboxRequest, ShareTargetPayload } from '@ttll/shared'

type CaptureInput = CreateInboxRequest | ShareTargetPayload

function isCreateInbox(input: CaptureInput): input is CreateInboxRequest {
  return 'sourceUrl' in input
}

export class InboxCaptureService {
  constructor(private readonly db: Kysely<Database>) {}
  async capture(userId: string, input: CaptureInput) {
    const likelyUrl = extractLikelyUrl(isCreateInbox(input) ? { sourceUrl: input.sourceUrl, sharedText: input.sharedText } : input)
    const identity = likelyUrl ? canonicalizeUrl(likelyUrl) : null
    const repo = new InboxRepository(this.db)
    return repo.create({
      userId,
      sourceUrl: identity?.sourceUrl ?? (isCreateInbox(input) ? (input.sourceUrl ?? null) : (input.url ?? null)),
      canonicalUrl: identity?.canonicalUrl ?? null,
      sharedTitle: (isCreateInbox(input) ? input.sharedTitle : input.title) ?? null,
      sharedText: (isCreateInbox(input) ? input.sharedText : input.text) ?? null,
      sourcePlatform: identity?.sourcePlatform ?? (isCreateInbox(input) ? (input.sourcePlatform ?? 'other') : 'other'),
      rawPayload: isCreateInbox(input) ? input.rawPayload : input
    })
  }
}
