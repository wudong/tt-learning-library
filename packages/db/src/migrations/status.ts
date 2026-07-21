import { createDb } from '../database/createDb'
import { migrationStatus } from './migrator'

const { db } = await createDb()
console.log('Status: PostgreSQL')
console.table(await migrationStatus(db))
await db.destroy()