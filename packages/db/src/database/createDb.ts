import { Kysely, PostgresDialect, sql } from 'kysely'
import { Pool } from 'pg'
import type { Database } from '../schema/database'

// ---- PostgreSQL adapter ----

export interface PgPoolOptions {
  connectionString: string
  max?: number
  /** libpq startup options, e.g. `-c search_path=tt_test,public`. */
  options?: string
}

export function createPgPool(opts: PgPoolOptions): Pool {
  const url = new URL(opts.connectionString)
  // Parse sslmode from query string
  const sslmode = url.searchParams.get('sslmode')
  const ssl =
    sslmode === 'require'
      ? { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' }
      : false

  return new Pool({
    connectionString: opts.connectionString,
    max: opts.max ?? 5,
    ssl: ssl || undefined,
    options: opts.options,
  })
}

// ---- Unified createDb ----

type DbContext = {
  db: Kysely<Database>
  /** PostgreSQL connection pool. */
  pgPool: Pool
}

export interface DbOptions {
  /** Override the connection string (defaults to process.env.DATABASE_URL). */
  connectionString?: string
  /** Max pool connections. */
  max?: number
  /** libpq startup options, e.g. `-c search_path=tt_test,public`. */
  options?: string
}

/**
 * Creates a Kysely database connection backed by PostgreSQL.
 *
 * PostgreSQL is the only supported database. `DATABASE_URL` must be set to a
 * `postgres://` or `postgresql://` connection string.
 */
export async function createDb(options: DbOptions = {}): Promise<DbContext> {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required (PostgreSQL connection string).')
  }
  if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
    throw new Error('DATABASE_URL must be a postgres:// or postgresql:// connection string.')
  }

  const pgPool = createPgPool({
    connectionString,
    max: options.max,
    options: options.options,
  })
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: pgPool }),
  })
  // Eagerly validate connectivity so misconfiguration fails fast.
  await sql`SELECT 1`.execute(db)
  return { db, pgPool }
}