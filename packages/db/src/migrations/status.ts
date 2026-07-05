import { createDb } from '../database/createDb'
import { migrationStatus } from './migrator'
const { db } = createDb({ databasePath: process.env.DATABASE_PATH ?? './.data/app.db' })
console.table(await migrationStatus(db))
await db.destroy()
