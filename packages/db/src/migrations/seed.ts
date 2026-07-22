import { createDb } from '../database/createDb'
import { migrateToLatest } from './migrator'
import { GraphRepository } from '../repositories/graphRepository'
import { TopicSkillRepository } from '../repositories/topicSkillRepository'
import { nowIso } from '../utils/time'
import { TABLE_TENNIS_TOPICS } from '@ttll/shared'

const { db } = await createDb()
await migrateToLatest(db)
const userId = process.env.DEV_USER_ID ?? 'user_local'
const now = nowIso()
await db.insertInto('users').values({ id: userId, email: 'local@example.test', display_name: 'Local Player', created_at: now, updated_at: now, deleted_at: null }).onConflict((oc)=>oc.column('id').doNothing()).execute()
const graph = new GraphRepository(db)
const repo = new TopicSkillRepository(db)
for (const name of TABLE_TENNIS_TOPICS) {
  const existing = await db.selectFrom('topics').selectAll().where('user_id','=',userId).where('name','=',name).where('deleted_at','is',null).executeTakeFirst()
  if (!existing) { const node = await graph.createNode({ userId, nodeType: 'topic', title: name }); await repo.createTopic({ userId, nodeId: node.id, name, isSystem: true }) }
}
console.log('Seeded local user, starter topics')
await db.destroy()
