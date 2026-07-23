import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export class TagRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async getTags(userId: string, ids: string[]) {
    if (!ids.length) return []
    return this.db.selectFrom('tags')
      .selectAll()
      .where('user_id', '=', userId)
      .where('id', 'in', ids)
      .where('deleted_at', 'is', null)
      .execute()
  }
}
