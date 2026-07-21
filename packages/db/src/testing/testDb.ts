import { sql } from 'kysely'
import { createDb } from '../database/createDb'
import { migrateToLatest } from '../migrations/migrator'

const TEST_SCHEMA = process.env.TEST_SCHEMA ?? 'tt_test'

/**
 * Creates a fresh, migrated PostgreSQL test context for a single test.
 *
 * Instead of creating a separate test database (which requires CREATEDB),
 * this resets a dedicated schema (default `tt_test`) inside the configured
 * database: DROP + CREATE the schema, then run all migrations into it. Every
 * pooled connection pins `search_path` to `tt_test, public` via libpq startup
 * options, so migrations and queries land in the test schema without leaking
 * into the application's `public` schema.
 *
 * The app role only needs CREATE privilege on the database, which the database
 * owner has automatically — true for the `ttlearn` owner of the docker-compose
 * `tt_learning` database.
 *
 * Each call resets the schema, so tests start clean. Run tests sequentially
 * within a file (bun:test does this by default) since they share one schema.
 */
export async function createMigratedTestDb() {
  const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL (or TEST_DATABASE_URL) is required for tests.')
  }

  const ctx = await createDb({
    connectionString,
    options: `-c search_path=${TEST_SCHEMA},public`,
  })
  const { db } = ctx

  // Reset the test schema for a clean slate.
  await sql`DROP SCHEMA IF EXISTS ${sql.raw(TEST_SCHEMA)} CASCADE`.execute(db)
  await sql`CREATE SCHEMA ${sql.raw(TEST_SCHEMA)} AUTHORIZATION CURRENT_USER`.execute(db)

  await migrateToLatest(db)
  return ctx
}