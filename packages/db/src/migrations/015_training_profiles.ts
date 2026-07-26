import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export const id = '20260726_015'
export const name = 'training_profiles'

export async function up(db: Kysely<Database>) {
  await db.schema.createTable('training_profiles')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('user_id', 'text', (c) => c.notNull().references('users.id'))
    .addColumn('display_name', 'text', (c) => c.notNull())
    .addColumn('profile_type', 'text', (c) => c.notNull().defaultTo('player'))
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .addColumn('deleted_at', 'text')
    .addCheckConstraint('training_profiles_type_check', sql`profile_type IN ('self', 'player')`)
    .execute()

  await db.schema.createIndex('idx_training_profiles_owner')
    .on('training_profiles')
    .columns(['user_id', 'deleted_at'])
    .execute()

  await sql`
    CREATE UNIQUE INDEX uniq_training_profiles_self_active
    ON training_profiles(user_id)
    WHERE profile_type = 'self' AND deleted_at IS NULL
  `.execute(db)

  await db.schema.alterTable('practice_sessions')
    .addColumn('profile_id', 'text', (c) => c.references('training_profiles.id'))
    .execute()

  const users = await db.selectFrom('users')
    .select(['id', 'display_name'])
    .where('deleted_at', 'is', null)
    .execute()

  for (const user of users) {
    const now = nowIso()
    const profileId = createId('profile')
    await db.insertInto('training_profiles').values({
      id: profileId,
      user_id: user.id,
      display_name: user.display_name?.trim() || 'My training',
      profile_type: 'self',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }).execute()
    await db.updateTable('practice_sessions')
      .set({ profile_id: profileId })
      .where('user_id', '=', user.id)
      .where('profile_id', 'is', null)
      .execute()
  }

  await db.schema.createIndex('idx_practice_sessions_profile_calendar')
    .on('practice_sessions')
    .columns(['user_id', 'profile_id', 'scheduled_date', 'deleted_at'])
    .execute()

  await sql.raw('ALTER TABLE training_profiles ENABLE ROW LEVEL SECURITY').execute(db)
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('practice_sessions').dropColumn('profile_id').execute()
  await db.schema.dropTable('training_profiles').execute()
}
