import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260722_006'
export const name = 'feedback_table_rls'

export async function up(db: Kysely<Database>) {
  await sql`ALTER TABLE feedback ENABLE ROW LEVEL SECURITY`.execute(db)
}

export async function down(db: Kysely<Database>) {
  await sql`ALTER TABLE feedback DISABLE ROW LEVEL SECURITY`.execute(db)
}
