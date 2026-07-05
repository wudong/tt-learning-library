import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { nowIso } from '../utils/time'
import { migrations } from './registry'

export async function ensureMigrationTable(db: Kysely<Database>) {
  await db.schema.createTable('schema_migrations').ifNotExists().addColumn('id','text',(c)=>c.primaryKey()).addColumn('name','text',(c)=>c.notNull()).addColumn('applied_at','text',(c)=>c.notNull()).execute()
}
export async function migrateToLatest(db: Kysely<Database>) {
  await ensureMigrationTable(db)
  const applied = await db.selectFrom('schema_migrations').select('id').execute()
  const appliedIds = new Set(applied.map((m) => m.id))
  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) continue
    await migration.up(db)
    await db.insertInto('schema_migrations').values({ id: migration.id, name: migration.name, applied_at: nowIso() }).execute()
  }
}
export async function migrationStatus(db: Kysely<Database>) {
  await ensureMigrationTable(db)
  const applied = await db.selectFrom('schema_migrations').selectAll().execute()
  return migrations.map((m) => ({ id: m.id, name: m.name, applied: applied.some((a) => a.id === m.id) }))
}
