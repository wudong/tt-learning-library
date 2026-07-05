import { createDb } from '../database/createDb'
import { migrateToLatest } from '../migrations/migrator'
export async function createMigratedTestDb() {
  const ctx = createDb({ memory: true })
  await migrateToLatest(ctx.db)
  return ctx
}
