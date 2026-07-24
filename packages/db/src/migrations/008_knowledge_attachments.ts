import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260724_008'
export const name = 'knowledge_node_picture_attachments'

export async function up(db: Kysely<Database>) {
  await db.schema.createTable('knowledge_attachments')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('user_id', 'text', (c) => c.notNull().references('users.id'))
    .addColumn('parent_node_id', 'text', (c) => c.notNull().references('graph_nodes.id'))
    .addColumn('file_name', 'text', (c) => c.notNull())
    .addColumn('media_type', 'text', (c) => c.notNull())
    .addColumn('byte_size', 'integer', (c) => c.notNull())
    .addColumn('width', 'integer')
    .addColumn('height', 'integer')
    .addColumn('content', 'bytea', (c) => c.notNull())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .addColumn('deleted_at', 'text')
    .addCheckConstraint('knowledge_attachments_size_check', sql`byte_size > 0 AND byte_size <= 5242880`)
    .addCheckConstraint('knowledge_attachments_media_type_check', sql`media_type IN ('image/jpeg', 'image/png', 'image/webp')`)
    .execute()
  await db.schema.createIndex('idx_knowledge_attachments_parent')
    .on('knowledge_attachments').columns(['user_id', 'parent_node_id', 'created_at']).execute()
  await sql`ALTER TABLE knowledge_attachments ENABLE ROW LEVEL SECURITY`.execute(db)
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('knowledge_attachments').execute()
}
