import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260724_009'
export const name = 'owner_topic_visibility'

export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('topics').addColumn('is_hidden', 'integer', (c) => c.notNull().defaultTo(0)).execute()
  await sql`UPDATE topics SET is_hidden = 1 WHERE is_system = 1 AND name IN ('Doubles', 'Rules & Officiating', 'Para Table Tennis', 'Coaching')`.execute(db)
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('topics').dropColumn('is_hidden').execute()
}
