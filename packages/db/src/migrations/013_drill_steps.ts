import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260724_013'
export const name = 'structured_drill_steps'

export async function up(db: Kysely<Database>) {
  await db.schema.createTable('drill_steps')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('drill_id', 'text', (c) => c.notNull().references('drills.id'))
    .addColumn('user_id', 'text', (c) => c.notNull().references('users.id'))
    .addColumn('position', 'integer', (c) => c.notNull())
    .addColumn('actor', 'text', (c) => c.notNull())
    .addColumn('stroke', 'text', (c) => c.notNull())
    .addColumn('spin', 'text', (c) => c.notNull())
    .addColumn('from_zone', 'text', (c) => c.notNull())
    .addColumn('target_zone', 'text', (c) => c.notNull())
    .addColumn('instruction', 'text')
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .addColumn('deleted_at', 'text')
    .addCheckConstraint('drill_steps_position_check', sql`position >= 0`)
    .addCheckConstraint('drill_steps_spin_check', sql`spin IN ('topspin', 'backspin', 'sidespin', 'no_spin', 'variable')`)
    .execute()
  await db.schema.createIndex('uniq_drill_steps_active_position').unique().on('drill_steps').columns(['user_id', 'drill_id', 'position']).where('deleted_at' as never, 'is', null).execute()
  await sql`ALTER TABLE drill_steps ENABLE ROW LEVEL SECURITY`.execute(db)
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('drill_steps').execute()
}
