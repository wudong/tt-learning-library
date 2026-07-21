import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class VideoRepository {
  constructor(private readonly db: Kysely<Database>) {}
  async findDuplicate(userId: string, identity: { sourcePlatform: string; externalId: string | null; canonicalUrl: string | null }) {
    if (identity.externalId) return this.db.selectFrom('videos').selectAll().where('user_id','=',userId).where('source_platform','=',identity.sourcePlatform).where('external_id','=',identity.externalId).where('deleted_at','is',null).executeTakeFirst()
    if (identity.canonicalUrl) return this.db.selectFrom('videos').selectAll().where('user_id','=',userId).where('canonical_url','=',identity.canonicalUrl).where('deleted_at','is',null).executeTakeFirst()
    return undefined
  }
  async create(input: { userId: string; nodeId: string; sourceUrl: string; canonicalUrl: string | null; sourcePlatform: string; externalId: string | null; title?: string | null; thumbnailUrl?: string | null; creatorName?: string | null; progress?: string; learningState?: string; rawMetadata?: unknown }) {
    const now = nowIso()
    const row = { id: createId('video'), node_id: input.nodeId, user_id: input.userId, source_url: input.sourceUrl, canonical_url: input.canonicalUrl, source_platform: input.sourcePlatform, external_id: input.externalId, title: input.title ?? null, description: null, thumbnail_url: input.thumbnailUrl ?? null, creator_name: input.creatorName ?? null, duration_seconds: null, progress: input.progress ?? 'saved', learning_state: input.learningState ?? 'none', importance: null, raw_metadata_json: input.rawMetadata ? JSON.stringify({ value: input.rawMetadata }) : null, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('videos').values(row).execute()
    return row
  }
  async patchMetadata(userId: string, id: string, patch: { title?: string | null; thumbnail_url?: string | null; creator_name?: string | null }) {
    const row = await this.db.updateTable('videos').set({ ...patch, updated_at: nowIso() }).where('user_id', '=', userId).where('id', '=', id).where('deleted_at', 'is', null).returningAll().executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND')
    return row
  }
  async list(userId: string, options: { q?: string; limit: number; offset: number; progress?: string; learningState?: string; sourcePlatform?: string }) {
    let q = this.db.selectFrom('videos').selectAll().where('user_id','=',userId).where('deleted_at','is',null)
    if (options.q) q = q.where((eb)=> eb.or([eb('title','like',`%${options.q}%`), eb('source_url','like',`%${options.q}%`)]))
    if (options.progress) q = q.where('progress','=',options.progress)
    if (options.learningState) q = q.where('learning_state','=',options.learningState)
    if (options.sourcePlatform) q = q.where('source_platform','=',options.sourcePlatform)
    const data = await q.orderBy('updated_at desc').limit(options.limit).offset(options.offset).execute()
    const total = data.length
    return { data, total }
  }
  async getById(userId: string, id: string) {
    return this.db.selectFrom('videos').selectAll().where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).executeTakeFirst()
  }
  async getByNodeId(userId: string, nodeId: string) {
    return this.db.selectFrom('videos').selectAll().where('user_id','=',userId).where('node_id','=',nodeId).where('deleted_at','is',null).executeTakeFirst()
  }
  async patch(userId: string, id: string, patch: { title?: string | null; description?: string | null; progress?: string; learning_state?: string; importance?: number | null }) {
    const row = await this.db.updateTable('videos').set({ ...patch, updated_at: nowIso() }).where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).returningAll().executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND')
    return row
  }
  async softDelete(userId: string, id: string) {
    const now = nowIso()
    const video = await this.getById(userId, id)
    if (!video) throw new Error('NOT_FOUND')
    await this.db.updateTable('videos').set({ deleted_at: now, updated_at: now }).where('id','=',id).execute()
    return video
  }
}
