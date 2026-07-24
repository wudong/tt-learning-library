import { expect, test } from 'bun:test'
import { sql } from 'kysely'
import { createDb, migrateToLatest, migrationStatus } from '../packages/db/src'

test('concurrent migrators serialize and record each migration once', async () => {
  const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL (or TEST_DATABASE_URL) is required for tests.')

  const schema = 'tt_migration_lock_test'
  const first = await createDb({ connectionString, options: `-c search_path=${schema},public` })
  const second = await createDb({ connectionString, options: `-c search_path=${schema},public` })

  try {
    await sql`DROP SCHEMA IF EXISTS ${sql.raw(schema)} CASCADE`.execute(first.db)
    await sql`CREATE SCHEMA ${sql.raw(schema)} AUTHORIZATION CURRENT_USER`.execute(first.db)

    await Promise.all([migrateToLatest(first.db), migrateToLatest(second.db)])

    const status = await migrationStatus(first.db)
    const records = await first.db.selectFrom('schema_migrations').select('id').execute()
    expect(status.every((migration) => migration.applied)).toBe(true)
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length)
    expect(records.length).toBe(status.length)
  } finally {
    await sql`DROP SCHEMA IF EXISTS ${sql.raw(schema)} CASCADE`.execute(first.db)
    await Promise.all([first.db.destroy(), second.db.destroy()])
  }
})
