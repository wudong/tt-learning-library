import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260706_003'
export const name = 'feedback_github_issue_link'

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .alterTable('feedback')
    .addColumn('github_issue_number', 'integer')
    .execute()
  await db.schema
    .alterTable('feedback')
    .addColumn('issue_synced_at', 'text')
    .execute()
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.alterTable('feedback').dropColumn('issue_synced_at').execute()
  await db.schema.alterTable('feedback').dropColumn('github_issue_number').execute()
}