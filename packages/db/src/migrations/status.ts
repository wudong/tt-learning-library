import { createDb } from '../database/createDb'
import { migrationStatus } from './migrator'

const databaseUrl = process.env.DATABASE_URL
const usingPostgres = !!databaseUrl && /^postgres(ql)?:\/\//i.test(databaseUrl)
const { db } = createDb({ databasePath: process.env.DATABASE_PATH ?? './.data/app.db' })
console.log(usingPostgres ? 'Status: PostgreSQL' : `Status: SQLite (${process.env.DATABASE_PATH ?? './.data/app.db'})`)
console.table(await migrationStatus(db))
await db.destroy()
