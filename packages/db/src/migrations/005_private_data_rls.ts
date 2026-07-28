import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260722_005'
export const name = 'private_application_tables_rls'

// RLS removed — application-layer user_id scoping is sufficient.
// This migration is a deliberate no-op. It was applied in production
// and the RLS was subsequently disabled on the server.
export async function up(_db: Kysely<Database>) {}

export async function down(_db: Kysely<Database>) {}
