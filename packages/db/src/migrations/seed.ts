import { createDb } from '../database/createDb'
import { migrateToLatest } from './migrator'
import { nowIso } from '../utils/time'
import { provisionOntology } from '../database/provisionOntology'

const { db } = await createDb()
await migrateToLatest(db)
const userId = process.env.DEV_USER_ID ?? 'user_local'
const now = nowIso()
await db.insertInto('users').values({ id: userId, email: 'local@example.test', display_name: 'Local Player', created_at: now, updated_at: now, deleted_at: null }).onConflict((oc)=>oc.column('id').doNothing()).execute()
await provisionOntology(db, userId)
console.log('Seeded local user and curated ontology')
await db.destroy()
