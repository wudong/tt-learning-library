import { createDb } from '../database/createDb'
import { migrateToLatest } from './migrator'

const { db } = await createDb()
await migrateToLatest(db)
await db.destroy()

const masked = (process.env.DATABASE_URL ?? '').replace(/:[^:@/]+@/, ':***@')
console.log(`Migrated PostgreSQL database at ${masked}`)