import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class AttachmentRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async create(input: { userId: string; nodeId: string; parentNodeId: string; fileName: string; mediaType: string; content: Uint8Array; width?: number | null; height?: number | null }) {
    const now = nowIso()
    const row = {
      id: createId('attachment'), node_id: input.nodeId, user_id: input.userId, parent_node_id: input.parentNodeId,
      file_name: input.fileName, media_type: input.mediaType, byte_size: input.content.byteLength,
      width: input.width ?? null, height: input.height ?? null, content: input.content,
      created_at: now, updated_at: now, deleted_at: null,
    }
    await this.db.insertInto('pictures').values(row).execute()
    return row
  }

  list(userId: string, parentNodeId: string) {
    return this.db.selectFrom('pictures as a')
      .innerJoin('graph_nodes as n', 'n.id', 'a.parent_node_id')
      .select(['a.id', 'a.node_id', 'a.parent_node_id', 'a.file_name', 'a.media_type', 'a.byte_size', 'a.width', 'a.height', 'a.created_at', 'a.updated_at'])
      .where('a.user_id', '=', userId).where('a.parent_node_id', '=', parentNodeId).where('a.deleted_at', 'is', null)
      .where('n.user_id', '=', userId).where('n.deleted_at', 'is', null)
      .orderBy('a.created_at', 'asc').orderBy('a.id', 'asc').execute()
  }

  get(userId: string, id: string) {
    return this.db.selectFrom('pictures as a')
      .innerJoin('graph_nodes as n', 'n.id', 'a.parent_node_id').selectAll('a')
      .where('a.user_id', '=', userId).where('a.id', '=', id).where('a.deleted_at', 'is', null)
      .where('n.user_id', '=', userId).where('n.deleted_at', 'is', null).executeTakeFirst()
  }

  async softDelete(userId: string, id: string) {
    const result = await this.db.updateTable('pictures').set({ deleted_at: nowIso(), updated_at: nowIso() })
      .where('user_id', '=', userId).where('id', '=', id).where('deleted_at', 'is', null).returning('id').executeTakeFirst()
    return !!result
  }
}
