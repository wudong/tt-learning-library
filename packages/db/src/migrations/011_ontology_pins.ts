import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260724_011'
export const name = 'owner_topic_and_skill_pins'

export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('topics').addColumn('is_pinned', 'integer', (c) => c.notNull().defaultTo(0)).execute()
  await db.schema.alterTable('skills').addColumn('is_pinned', 'integer', (c) => c.notNull().defaultTo(0)).execute()
  await db.schema.alterTable('drills').addColumn('is_pinned', 'integer', (c) => c.notNull().defaultTo(0)).execute()
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('drills').dropColumn('is_pinned').execute()
  await db.schema.alterTable('skills').dropColumn('is_pinned').execute()
  await db.schema.alterTable('topics').dropColumn('is_pinned').execute()
}
