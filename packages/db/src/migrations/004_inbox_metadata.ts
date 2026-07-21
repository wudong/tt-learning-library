import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260721_004'
export const name = 'inbox_youtube_metadata'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('inbox_items').addColumn('thumbnail_url', 'text').execute()
  await db.schema.alterTable('inbox_items').addColumn('creator_name', 'text').execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('inbox_items').dropColumn('creator_name').execute()
  await db.schema.alterTable('inbox_items').dropColumn('thumbnail_url').execute()
}
