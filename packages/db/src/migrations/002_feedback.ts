import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260705_002'
export const name = 'feedback_table'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('feedback')
    .ifNotExists()
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('name', 'text')
    .addColumn('email', 'text')
    .addColumn('message_type', 'text', (c) => c.notNull())
    .addColumn('message', 'text', (c) => c.notNull())
    .addColumn('page_path', 'text')
    .addColumn('page_title', 'text')
    .addColumn('created_at', 'text', (c) => c.notNull())
    .execute()

  await db.schema
    .createIndex('idx_feedback_created_at')
    .ifNotExists()
    .on('feedback')
    .column('created_at')
    .execute()
}

export async function down(_db: Kysely<Database>): Promise<void> {
  await _db.schema.dropTable('feedback').ifExists().execute()
}
