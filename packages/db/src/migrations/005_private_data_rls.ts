import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260722_005'
export const name = 'private_application_tables_rls'

const PRIVATE_TABLES = [
  'users', 'graph_nodes', 'graph_edges', 'videos', 'topics', 'skills', 'notes',
  'drills', 'mistakes', 'tags', 'learning_paths', 'learning_path_items',
  'collections', 'collection_items', 'inbox_items', 'share_links',
] as const

export async function up(db: Kysely<Database>) {
  for (const table of PRIVATE_TABLES) {
    await sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`).execute(db)
  }
}

export async function down(db: Kysely<Database>) {
  for (const table of [...PRIVATE_TABLES].reverse()) {
    await sql.raw(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`).execute(db)
  }
}
