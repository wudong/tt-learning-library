import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260722_006'
export const name = 'feedback_table_rls'

// RLS removed — application-layer user_id scoping is sufficient.
export async function up(_db: Kysely<Database>) {}

export async function down(_db: Kysely<Database>) {}
