import { Database as BunSqliteDatabase } from 'bun:sqlite'
import type { SQLQueryBindings } from 'bun:sqlite'
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from '../schema/database'

export interface DbOptions {
  databasePath?: string
  memory?: boolean
  readonly?: boolean
}

// ---- SQLite adapter (unchanged from original) ----

class BunSqliteAdapter {
  constructor(private readonly database: BunSqliteDatabase) {}

  close() {
    this.database.close()
  }

  prepare(sql: string) {
    const statement = this.database.prepare(sql)
    return {
      get reader() {
        return statement.columnNames.length > 0
      },
      all(parameters: ReadonlyArray<unknown>) {
        return statement.all(...([...parameters] as SQLQueryBindings[])) as unknown[]
      },
      run(parameters: ReadonlyArray<unknown>) {
        return statement.run(...([...parameters] as SQLQueryBindings[]))
      },
      iterate(parameters: ReadonlyArray<unknown>) {
        return statement.iterate(...([...parameters] as SQLQueryBindings[])) as IterableIterator<unknown>
      },
    }
  }
}

export function createSqliteConnection(options: DbOptions = {}) {
  const path = options.memory
    ? ':memory:'
    : options.databasePath ?? process.env.DATABASE_PATH ?? './.data/app.db'
  const sqlite = new BunSqliteDatabase(path, {
    readonly: options.readonly ?? false,
    create: !(options.readonly ?? false),
  })
  sqlite.run('PRAGMA foreign_keys = ON')
  if (!options.memory && !options.readonly) sqlite.run('PRAGMA journal_mode = WAL')
  sqlite.run('PRAGMA busy_timeout = 5000')
  return sqlite
}

// ---- PostgreSQL adapter ----

export interface PgPoolOptions {
  connectionString: string
  max?: number
}

export function createPgPool(opts: PgPoolOptions): Pool {
  const url = new URL(opts.connectionString)
  // Parse sslmode from query string
  const sslmode = url.searchParams.get('sslmode')
  const ssl = sslmode === 'require'
    ? { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' }
    : false

  return new Pool({
    connectionString: opts.connectionString,
    max: opts.max ?? 5,
    ssl: ssl || undefined,
  })
}

// ---- Unified createDb ----

type DbContext = {
  db: Kysely<Database>
  /** Present when using SQLite (local/dev). */
  sqlite?: BunSqliteDatabase
  /** Present when using PostgreSQL (production). */
  pgPool?: Pool
}

/**
 * Creates a Kysely database connection.
 *
 * - If `DATABASE_URL` is set and starts with `postgres://` or `postgresql://`,
 *   uses a PostgresDialect with connection pooling (production mode).
 * - Otherwise, uses SqliteDialect backed by `bun:sqlite` (local/dev mode).
 *
 * Options like `memory: true` force SQLite in-memory.
 */
export function createDb(options: DbOptions = {}): DbContext {
  const databaseUrl = process.env.DATABASE_URL

  // PostgreSQL path (production)
  if (!options.memory && databaseUrl && /^postgres(ql)?:\/\//i.test(databaseUrl)) {
    const pool = createPgPool({ connectionString: databaseUrl })
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    })
    return { db, pgPool: pool }
  }

  // SQLite path (local/dev/test)
  const sqlite = createSqliteConnection(options)
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({ database: new BunSqliteAdapter(sqlite) }),
  })
  return { db, sqlite }
}
