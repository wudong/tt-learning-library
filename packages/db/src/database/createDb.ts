import { Kysely, PostgresDialect, sql } from 'kysely'
import { Pool } from 'pg'
import type { Database } from '../schema/database'

// ---- PostgreSQL adapter ----

export interface PgPoolOptions {
  connectionString: string
  max?: number
  ca?: string
  /** libpq startup options, e.g. `-c search_path=tt_test,public`. */
  options?: string
}

export function createPgPool(opts: PgPoolOptions): Pool {
  const url = new URL(opts.connectionString)
  // Parse sslmode from query string
  const sslmode = url.searchParams.get('sslmode')
  const ca = opts.ca ?? process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
  const ssl =
    sslmode === 'require' || sslmode === 'verify-full'
      ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
      : false

  // node-postgres lets sslmode from the connection string replace the explicit
  // SSL object, which would discard our provider CA. Remove only that parsed
  // option after deriving the TLS policy above.
  if (sslmode) url.searchParams.delete('sslmode')

  return new Pool({
    connectionString: url.toString(),
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
  /** PEM certificate authority used to verify hosted PostgreSQL. */
  ca?: string
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
    ca: options.ca,
    options: options.options,
  })
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: pgPool }),
  })
  // Eagerly validate connectivity so misconfiguration fails fast.
  await sql`SELECT 1`.execute(db)
  return { db, pgPool }
}
