import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class InboxRepository {
  constructor(private readonly db: Kysely<Database>) {}
  async create(input: { userId: string; sourceUrl?: string | null; canonicalUrl?: string | null; sharedTitle?: string | null; sharedText?: string | null; sourcePlatform?: string; rawPayload?: unknown }) {
    const now = nowIso()
    const row = { id: createId('inbox'), user_id: input.userId, source_url: input.sourceUrl ?? null, canonical_url: input.canonicalUrl ?? null, shared_title: input.sharedTitle ?? null, shared_text: input.sharedText ?? null, source_platform: input.sourcePlatform ?? 'other', raw_payload_json: input.rawPayload ? JSON.stringify(input.rawPayload).slice(0, 12000) : null, status: 'new', converted_node_id: null, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('inbox_items').values(row).execute()
    return row
  }
  async list(userId: string, options: { status?: string; limit: number; offset: number }) {
    let q = this.db.selectFrom('inbox_items').selectAll().where('user_id','=',userId).where('deleted_at','is',null)
    if (options.status) q = q.where('status','=',options.status)
    const data = await q.orderBy('created_at desc').limit(options.limit).offset(options.offset).execute()
    const total = Number((await this.db.selectFrom('inbox_items').select((eb)=>eb.fn.countAll().as('count')).where('user_id','=',userId).where('deleted_at','is',null).executeTakeFirst())?.count ?? 0)
    return { data, total }
  }
  async get(userId: string, id: string) {
    return this.db.selectFrom('inbox_items').selectAll().where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).executeTakeFirst()
  }
  async patch(userId: string, id: string, patch: { source_url?: string | null; canonical_url?: string | null; shared_title?: string | null; shared_text?: string | null; status?: string }) {
    const row = await this.db.updateTable('inbox_items').set({ ...patch, updated_at: nowIso() }).where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).returningAll().executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND')
    return row
  }
  async markConverted(userId: string, id: string, convertedNodeId: string) {
    const row = await this.db.updateTable('inbox_items')
      .set({ status: 'organized', converted_node_id: convertedNodeId, updated_at: nowIso() })
      .where('user_id', '=', userId).where('id', '=', id).where('deleted_at', 'is', null)
      .returningAll().executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND')
    return row
  }
  async softDelete(userId: string, id: string) {
    await this.db.updateTable('inbox_items').set({ deleted_at: nowIso(), updated_at: nowIso() }).where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).execute()
  }
}
