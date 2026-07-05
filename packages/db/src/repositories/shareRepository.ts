import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class ShareRepository {
  constructor(private readonly db: Kysely<Database>) {}
  async create(input: { userId: string; targetNodeId: string; tokenHash: string; tokenPrefix: string; expiresAt?: string | null }) {
    const now = nowIso()
    const row = { id: createId('share'), user_id: input.userId, target_node_id: input.targetNodeId, token_hash: input.tokenHash, token_prefix: input.tokenPrefix, visibility: 'unlisted', expires_at: input.expiresAt ?? null, revoked_at: null, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('share_links').values(row).execute()
    return row
  }
  async getByHash(tokenHash: string) { return this.db.selectFrom('share_links').selectAll().where('token_hash','=',tokenHash).where('deleted_at','is',null).executeTakeFirst() }
  async revoke(userId: string, id: string) { return this.db.updateTable('share_links').set({ revoked_at: nowIso(), updated_at: nowIso() }).where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).returningAll().executeTakeFirst() }
  async revokeForNode(userId: string, nodeId: string) { await this.db.updateTable('share_links').set({ revoked_at: nowIso(), updated_at: nowIso() }).where('user_id','=',userId).where('target_node_id','=',nodeId).where('revoked_at','is',null).where('deleted_at','is',null).execute() }
}
