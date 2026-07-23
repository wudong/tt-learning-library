import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260723_007'
export const name = 'training_plans_sessions_and_checkins'

export async function up(db: Kysely<Database>) {
  await db.schema.createTable('practice_sessions')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('node_id', 'text', (c) => c.notNull().unique().references('graph_nodes.id'))
    .addColumn('user_id', 'text', (c) => c.notNull().references('users.id'))
    .addColumn('scheduled_date', 'text', (c) => c.notNull())
    .addColumn('time_zone', 'text', (c) => c.notNull())
    .addColumn('title', 'text', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('planned'))
    .addColumn('entry_mode', 'text', (c) => c.notNull().defaultTo('planned'))
    .addColumn('overall_rating', 'integer')
    .addColumn('reflection', 'text')
    .addColumn('started_at', 'text')
    .addColumn('completed_at', 'text')
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .addColumn('deleted_at', 'text')
    .addCheckConstraint('practice_sessions_rating_check', sql`overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5`)
    .execute()
  await db.schema.createIndex('idx_practice_sessions_calendar').on('practice_sessions').columns(['user_id', 'scheduled_date', 'deleted_at']).execute()
  await db.schema.createIndex('idx_practice_sessions_status').on('practice_sessions').columns(['user_id', 'status', 'deleted_at']).execute()

  await db.schema.createTable('practice_session_blocks')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('session_id', 'text', (c) => c.notNull().references('practice_sessions.id'))
    .addColumn('user_id', 'text', (c) => c.notNull().references('users.id'))
    .addColumn('skill_id', 'text', (c) => c.notNull().references('skills.id'))
    .addColumn('drill_id', 'text', (c) => c.references('drills.id'))
    .addColumn('video_id', 'text', (c) => c.references('videos.id'))
    .addColumn('position', 'integer', (c) => c.notNull())
    .addColumn('original_position', 'integer')
    .addColumn('planned_duration_seconds', 'integer')
    .addColumn('original_planned_duration_seconds', 'integer')
    .addColumn('actual_duration_seconds', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('timer_started_at', 'text')
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('planned'))
    .addColumn('focus_note', 'text')
    .addColumn('started_at', 'text')
    .addColumn('completed_at', 'text')
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .addColumn('deleted_at', 'text')
    .addCheckConstraint('practice_blocks_position_check', sql`position >= 0`)
    .addCheckConstraint('practice_blocks_duration_check', sql`actual_duration_seconds >= 0 AND (planned_duration_seconds IS NULL OR planned_duration_seconds > 0)`)
    .execute()
  await db.schema.createIndex('idx_practice_blocks_session').on('practice_session_blocks').columns(['user_id', 'session_id', 'position', 'deleted_at']).execute()
  await db.schema.createIndex('idx_practice_blocks_skill').on('practice_session_blocks').columns(['user_id', 'skill_id', 'deleted_at']).execute()

  await db.schema.createTable('practice_skill_checkins')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('session_id', 'text', (c) => c.notNull().references('practice_sessions.id'))
    .addColumn('user_id', 'text', (c) => c.notNull().references('users.id'))
    .addColumn('skill_id', 'text', (c) => c.notNull().references('skills.id'))
    .addColumn('confidence_rating', 'integer')
    .addColumn('note', 'text')
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .addColumn('deleted_at', 'text')
    .addCheckConstraint('practice_checkins_confidence_check', sql`confidence_rating IS NULL OR confidence_rating BETWEEN 1 AND 5`)
    .execute()
  await db.schema.createIndex('uniq_practice_checkins_active').unique().on('practice_skill_checkins').columns(['user_id', 'session_id', 'skill_id']).where('deleted_at' as never, 'is', null).execute()
  await db.schema.createIndex('idx_practice_checkins_skill').on('practice_skill_checkins').columns(['user_id', 'skill_id', 'deleted_at']).execute()

  for (const table of ['practice_sessions', 'practice_session_blocks', 'practice_skill_checkins']) {
    await sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`).execute(db)
  }
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('practice_skill_checkins').execute()
  await db.schema.dropTable('practice_session_blocks').execute()
  await db.schema.dropTable('practice_sessions').execute()
}
