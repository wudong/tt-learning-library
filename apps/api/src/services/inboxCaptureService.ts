import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { InboxRepository, canonicalizeUrl, extractLikelyUrl } from '@ttll/db'
import type { CreateInboxRequest, ShareTargetPayload } from '@ttll/shared'
import { YouTubeMetadataService, type VideoMetadataProvider } from './youtubeMetadataService'

type CaptureInput = CreateInboxRequest | ShareTargetPayload

function isCreateInbox(input: CaptureInput): input is CreateInboxRequest {
  return 'sourceUrl' in input
}

export class InboxCaptureService {
  constructor(private readonly db: Kysely<Database>, private readonly metadataProvider: VideoMetadataProvider = new YouTubeMetadataService()) {}
  async capture(userId: string, input: CaptureInput) {
    const likelyUrl = extractLikelyUrl(isCreateInbox(input) ? { sourceUrl: input.sourceUrl, sharedText: input.sharedText } : input)
    const identity = likelyUrl ? canonicalizeUrl(likelyUrl) : null
    const repo = new InboxRepository(this.db)
    const row = await repo.create({
      userId,
      sourceUrl: identity?.sourceUrl ?? (isCreateInbox(input) ? (input.sourceUrl ?? null) : (input.url ?? null)),
      canonicalUrl: identity?.canonicalUrl ?? null,
      sharedTitle: (isCreateInbox(input) ? input.sharedTitle : input.title) ?? null,
      sharedText: (isCreateInbox(input) ? input.sharedText : input.text) ?? null,
      sourcePlatform: identity?.sourcePlatform ?? (isCreateInbox(input) ? (input.sourcePlatform ?? 'other') : 'other'),
      rawPayload: isCreateInbox(input) ? input.rawPayload : input
    })
    if (identity?.sourcePlatform !== 'youtube' || !identity.externalId) return row
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    if (await repo.countRecent(userId, since) > 30) return row
    const metadata = await this.metadataProvider.fetch(identity.externalId)
    if (!metadata) return row
    return repo.patch(userId, row.id, {
      shared_title: row.shared_title || metadata.title,
      thumbnail_url: metadata.thumbnailUrl,
      creator_name: metadata.creatorName
    })
  }
}
