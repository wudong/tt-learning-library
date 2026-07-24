import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260724_012'
export const name = 'curated_starter_drills'

export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('drills').addColumn('is_system', 'integer', (c) => c.notNull().defaultTo(0)).execute()
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('drills').dropColumn('is_system').execute()
}
