import { sql, type Kysely, type Transaction } from 'kysely'
import { PLAYER_DEFAULT_TOPICS, TABLE_TENNIS_DRILLS, TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS } from '@ttll/shared'
import { NoteDrillRepository } from '../repositories/noteDrillRepository'
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
    const topic = await repository.createTopic({ userId, nodeId: node.id, name, isSystem: true, isHidden: !(PLAYER_DEFAULT_TOPICS as readonly string[]).includes(name) })
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

  const skills = await repository.listSystemSkills(userId)
  const skillsByName = new Map(skills.map((skill) => [skill.name, skill]))
  const existingDrills = await new NoteDrillRepository(conn).listDrills(userId)
  const systemDrillTitles = new Set(existingDrills.filter((drill) => drill.is_system === 1).map((drill) => drill.title))
  for (const definition of TABLE_TENNIS_DRILLS) {
    if (systemDrillTitles.has(definition.title)) continue
    const skill = skillsByName.get(definition.skill)
    if (!skill) throw new Error(`Ontology drill skill missing: ${definition.skill}`)
    const node = await graph.createNode({ userId, nodeType: 'drill', title: definition.title, summary: definition.description })
    const drillRepository = new NoteDrillRepository(conn)
    const drill = await drillRepository.createDrill({ userId, nodeId: node.id, title: definition.title, description: definition.description, diagramUrl: definition.imageUrl, durationMinutes: definition.durationMinutes, isSystem: true })
    await drillRepository.createSteps(userId, drill.id, definition.steps.map((step) => ({ ...step })))
    await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: skill.node_id, edgeType: 'practices' })
  }
}
