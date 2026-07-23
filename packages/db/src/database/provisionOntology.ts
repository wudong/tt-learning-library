import { sql, type Kysely, type Transaction } from 'kysely'
import { TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS } from '@ttll/shared'
import type { Database } from '../schema/database'
import { GraphRepository } from '../repositories/graphRepository'
import { TopicSkillRepository } from '../repositories/topicSkillRepository'

type Conn = Kysely<Database> | Transaction<Database>

export async function provisionOntology(db: Kysely<Database>, userId: string) {
  return db.transaction().execute((trx) => provisionOntologyInTransaction(trx, userId))
}

async function provisionOntologyInTransaction(conn: Conn, userId: string) {
  await sql`select pg_advisory_xact_lock(hashtext(${`ttll-ontology:${userId}`}))`.execute(conn)
  const graph = new GraphRepository(conn)
  const repository = new TopicSkillRepository(conn)
  const existingTopics = await repository.listSystemTopics(userId)
  const topicsByName = new Map(existingTopics.map((topic) => [topic.name, topic]))

  for (const name of TABLE_TENNIS_TOPICS) {
    if (topicsByName.has(name)) continue
    const node = await graph.createNode({ userId, nodeType: 'topic', title: name })
    const topic = await repository.createTopic({ userId, nodeId: node.id, name, isSystem: true })
    topicsByName.set(name, topic)
  }

  const existingSkills = await repository.listSystemSkills(userId)
  const skillNames = new Set(existingSkills.map((skill) => skill.name))
  for (const definition of TABLE_TENNIS_SKILLS) {
    if (skillNames.has(definition.name)) continue
    const topic = topicsByName.get(definition.topic)
    if (!topic) throw new Error(`Ontology topic missing: ${definition.topic}`)
    const node = await graph.createNode({ userId, nodeType: 'skill', title: definition.name })
    await repository.createSkill({ userId, nodeId: node.id, name: definition.name, topicId: topic.id, isSystem: true })
    await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: topic.node_id, edgeType: 'belongs_to' })
  }
}
