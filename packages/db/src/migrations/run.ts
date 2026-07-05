import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createDb } from '../database/createDb'
import { migrateToLatest } from './migrator'

const databaseUrl = process.env.DATABASE_URL
const usingPostgres = !!databaseUrl && /^postgres(ql)?:\/\//i.test(databaseUrl)
const path = process.env.DATABASE_PATH ?? './.data/app.db'

// Only ensure the SQLite file directory exists when not using Postgres.
if (!usingPostgres) mkdirSync(dirname(path), { recursive: true })

const { db } = createDb({ databasePath: path })
await migrateToLatest(db)
await db.destroy()

if (usingPostgres) {
  const masked = databaseUrl.replace(/:[^:@/]+@/, ':***@')
  console.log(`Migrated PostgreSQL database at ${masked}`)
} else {
  console.log(`Migrated SQLite database at ${path}`)
}
