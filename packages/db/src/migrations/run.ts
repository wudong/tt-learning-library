import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createDb } from '../database/createDb'
import { migrateToLatest } from './migrator'
const path = process.env.DATABASE_PATH ?? './.data/app.db'
mkdirSync(dirname(path), { recursive: true })
const { db } = createDb({ databasePath: path })
await migrateToLatest(db)
await db.destroy()
console.log(`Migrated database at ${path}`)
