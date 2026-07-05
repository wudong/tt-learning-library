import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createDb } from '../database/createDb'
import { migrateToLatest } from './migrator'
import { GraphRepository } from '../repositories/graphRepository'
import { TopicSkillRepository } from '../repositories/topicSkillRepository'
import { nowIso } from '../utils/time'

const path = process.env.DATABASE_PATH ?? './.data/app.db'
mkdirSync(dirname(path), { recursive: true })
const { db } = createDb({ databasePath: path })
await migrateToLatest(db)
const userId = process.env.DEV_USER_ID ?? 'user_local'
const now = nowIso()
await db.insertInto('users').values({ id: userId, email: 'local@example.test', display_name: 'Local Player', created_at: now, updated_at: now, deleted_at: null }).onConflict((oc)=>oc.column('id').doNothing()).execute()
const graph = new GraphRepository(db)
const repo = new TopicSkillRepository(db)
const topics = ['Serve','Receive','Forehand','Backhand','Footwork','Match Tactics']
for (const name of topics) {
  const existing = await db.selectFrom('topics').selectAll().where('user_id','=',userId).where('name','=',name).where('deleted_at','is',null).executeTakeFirst()
  if (!existing) { const node = await graph.createNode({ userId, nodeType: 'topic', title: name }); await repo.createTopic({ userId, nodeId: node.id, name, isSystem: true }) }
}
console.log('Seeded local user, starter topics')
await db.destroy()
