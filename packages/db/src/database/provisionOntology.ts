import { sql, type Kysely, type Transaction } from 'kysely'
import {
  ADDITIONAL_TABLE_TENNIS_DRILLS,
  PLAYER_DEFAULT_TOPICS,
  TABLE_TENNIS_DRILLS,
  TABLE_TENNIS_DRILL_INSTRUCTIONS,
  TABLE_TENNIS_DRILL_RELATED_SKILLS,
  TABLE_TENNIS_SKILLS,
  TABLE_TENNIS_SKILL_LINKS,
  TABLE_TENNIS_TOPICS,
  TABLE_TENNIS_TOPIC_LINKS,
  enrichedTableTennisSkillDescription,
  tableTennisTopicDescription,
} from '@ttll/shared'
import { NoteDrillRepository } from '../repositories/noteDrillRepository'
import type { Database } from '../schema/database'
import { GraphRepository } from '../repositories/graphRepository'
import { TopicSkillRepository } from '../repositories/topicSkillRepository'
import { nowIso } from '../utils/time'

type Conn = Kysely<Database> | Transaction<Database>

type DrillDefinition = {
  title: string
  skill: string
  imageUrl: string | null
  description: string
  instructions: string
  durationMinutes: number
  steps: ReadonlyArray<{
    actor: string
    stroke: string
    spin: string
    fromZone: string
    targetZone: string
    instruction?: string | null
  }>
}

const DRILL_DEFINITIONS: DrillDefinition[] = [
  ...TABLE_TENNIS_DRILLS.map((definition) => ({
    ...definition,
    imageUrl: definition.imageUrl as string | null,
    instructions: TABLE_TENNIS_DRILL_INSTRUCTIONS[definition.title] ?? definition.description,
  })),
  ...ADDITIONAL_TABLE_TENNIS_DRILLS.map((definition) => ({ ...definition })),
]

export async function provisionOntology(db: Kysely<Database>, userId: string) {
  if (await ontologyContentIsCurrent(db, userId)) return
  return db.transaction().execute((trx) => provisionOntologyInTransaction(trx, userId))
}

async function ontologyContentIsCurrent(db: Kysely<Database>, userId: string) {
  const [topicCount, skillCount, drillCount, topic, skill, drill, markerEdge] = await Promise.all([
    db.selectFrom('topics').select((eb) => eb.fn.countAll().as('count')).where('user_id', '=', userId).where('is_system', '=', 1).where('deleted_at', 'is', null).executeTakeFirst(),
    db.selectFrom('skills').select((eb) => eb.fn.countAll().as('count')).where('user_id', '=', userId).where('is_system', '=', 1).where('deleted_at', 'is', null).executeTakeFirst(),
    db.selectFrom('drills').select((eb) => eb.fn.countAll().as('count')).where('user_id', '=', userId).where('is_system', '=', 1).where('deleted_at', 'is', null).executeTakeFirst(),
    db.selectFrom('topics').select('description').where('user_id', '=', userId).where('name', '=', 'Backhand').where('is_system', '=', 1).where('deleted_at', 'is', null).executeTakeFirst(),
    db.selectFrom('skills').select('description').where('user_id', '=', userId).where('name', '=', 'Backhand Chop').where('is_system', '=', 1).where('deleted_at', 'is', null).executeTakeFirst(),
    db.selectFrom('drills').select(['description', 'instructions']).where('user_id', '=', userId).where('title', '=', 'Backhand Chop Depth Control').where('is_system', '=', 1).where('deleted_at', 'is', null).executeTakeFirst(),
    db.selectFrom('graph_edges as edge')
      .innerJoin('graph_nodes as source', 'source.id', 'edge.source_node_id')
      .innerJoin('graph_nodes as target', 'target.id', 'edge.target_node_id')
      .select('edge.id')
      .where('edge.user_id', '=', userId)
      .where('edge.edge_type', '=', 'requires')
      .where('edge.deleted_at', 'is', null)
      .where('source.user_id', '=', userId).where('source.title', '=', 'Backhand Chop').where('source.deleted_at', 'is', null)
      .where('target.user_id', '=', userId).where('target.title', '=', 'Generating Backspin').where('target.deleted_at', 'is', null)
      .executeTakeFirst(),
  ])

  return Number(topicCount?.count ?? 0) >= TABLE_TENNIS_TOPICS.length
    && Number(skillCount?.count ?? 0) >= TABLE_TENNIS_SKILLS.length
    && Number(drillCount?.count ?? 0) >= DRILL_DEFINITIONS.length
    && topic?.description === tableTennisTopicDescription('Backhand')
    && skill?.description === enrichedTableTennisSkillDescription({ name: 'Backhand Chop', topic: 'Backhand' })
    && drill?.description === ADDITIONAL_TABLE_TENNIS_DRILLS[0].description
    && drill.instructions === ADDITIONAL_TABLE_TENNIS_DRILLS[0].instructions
    && !!markerEdge
}

async function provisionOntologyInTransaction(conn: Conn, userId: string) {
  await sql`select pg_advisory_xact_lock(hashtext(${`ttll-ontology:${userId}`}))`.execute(conn)
  const graph = new GraphRepository(conn)
  const repository = new TopicSkillRepository(conn)
  const existingTopics = await repository.listSystemTopics(userId)
  const topicsByName = new Map(existingTopics.map((topic) => [topic.name, topic]))

  for (const name of TABLE_TENNIS_TOPICS) {
    const description = tableTennisTopicDescription(name)
    const existing = topicsByName.get(name)
    if (existing) {
      if (existing.description !== description) await repository.setTopicDescription(userId, existing.node_id, description)
      const node = await graph.getNode(userId, existing.node_id)
      if (node && node.summary !== description) await graph.updateNode(userId, node.id, { summary: description })
      topicsByName.set(name, { ...existing, description })
      continue
    }
    const node = await graph.createNode({ userId, nodeType: 'topic', title: name, summary: description })
    const topic = await repository.createTopic({
      userId,
      nodeId: node.id,
      name,
      description,
      isSystem: true,
      isHidden: !(PLAYER_DEFAULT_TOPICS as readonly string[]).includes(name),
    })
    topicsByName.set(name, topic)
  }

  for (const link of TABLE_TENNIS_TOPIC_LINKS) {
    const source = topicsByName.get(link.source)
    const target = topicsByName.get(link.target)
    if (!source || !target) throw new Error(`Ontology topic link missing endpoint: ${link.source} -> ${link.target}`)
    await graph.createEdge({ userId, sourceNodeId: source.node_id, targetNodeId: target.node_id, edgeType: link.edgeType })
  }

  const existingSkills = await repository.listSystemSkills(userId)
  const skillsByName = new Map(existingSkills.map((skill) => [skill.name, skill]))
  for (const definition of TABLE_TENNIS_SKILLS) {
    const description = enrichedTableTennisSkillDescription(definition)
    const topic = topicsByName.get(definition.topic)
    if (!topic) throw new Error(`Ontology topic missing: ${definition.topic}`)
    const existing = skillsByName.get(definition.name)
    if (existing) {
      if (existing.description !== description) await repository.setSkillDescription(userId, existing.node_id, description)
      const node = await graph.getNode(userId, existing.node_id)
      if (node && node.summary !== description) await graph.updateNode(userId, node.id, { summary: description })
      await graph.createEdge({ userId, sourceNodeId: existing.node_id, targetNodeId: topic.node_id, edgeType: 'belongs_to' })
      skillsByName.set(definition.name, { ...existing, description })
      continue
    }
    const node = await graph.createNode({ userId, nodeType: 'skill', title: definition.name, summary: description })
    const createdSkill = await repository.createSkill({ userId, nodeId: node.id, name: definition.name, description, topicId: topic.id, isSystem: true })
    await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: topic.node_id, edgeType: 'belongs_to' })
    skillsByName.set(definition.name, createdSkill)
  }

  for (const link of TABLE_TENNIS_SKILL_LINKS) {
    const source = skillsByName.get(link.source)
    const target = skillsByName.get(link.target)
    if (!source || !target) throw new Error(`Ontology skill link missing endpoint: ${link.source} -> ${link.target}`)
    await graph.createEdge({ userId, sourceNodeId: source.node_id, targetNodeId: target.node_id, edgeType: link.edgeType })
  }

  const drillRepository = new NoteDrillRepository(conn)
  const existingDrills = await drillRepository.listDrills(userId)
  const systemDrillsByTitle = new Map(existingDrills.filter((existingDrill) => existingDrill.is_system === 1).map((existingDrill) => [existingDrill.title, existingDrill]))

  for (const definition of DRILL_DEFINITIONS) {
    const primarySkill = skillsByName.get(definition.skill)
    if (!primarySkill) throw new Error(`Ontology drill skill missing: ${definition.skill}`)
    let drill = systemDrillsByTitle.get(definition.title)

    if (!drill) {
      const node = await graph.createNode({ userId, nodeType: 'drill', title: definition.title, summary: definition.description })
      drill = await drillRepository.createDrill({
        userId,
        nodeId: node.id,
        title: definition.title,
        description: definition.description,
        instructions: definition.instructions,
        diagramUrl: definition.imageUrl,
        durationMinutes: definition.durationMinutes,
        isSystem: true,
      })
      await drillRepository.createSteps(userId, drill.id, definition.steps.map((step) => ({ ...step })))
      systemDrillsByTitle.set(definition.title, drill)
    } else {
      const now = nowIso()
      await conn.updateTable('drills').set({
        description: definition.description,
        instructions: definition.instructions,
        diagram_url: definition.imageUrl,
        duration_minutes: definition.durationMinutes,
        updated_at: now,
      }).where('user_id', '=', userId).where('id', '=', drill.id).where('deleted_at', 'is', null).execute()
      const node = await graph.getNode(userId, drill.node_id)
      if (node && node.summary !== definition.description) await graph.updateNode(userId, node.id, { summary: definition.description })
      const steps = await drillRepository.listSteps(userId, drill.id)
      if (!steps.length) await drillRepository.createSteps(userId, drill.id, definition.steps.map((step) => ({ ...step })))
      drill = { ...drill, description: definition.description, instructions: definition.instructions, diagram_url: definition.imageUrl, duration_minutes: definition.durationMinutes, updated_at: now }
      systemDrillsByTitle.set(definition.title, drill)
    }

    const relatedSkillNames = new Set([definition.skill, ...(TABLE_TENNIS_DRILL_RELATED_SKILLS[definition.title] ?? [])])
    for (const skillName of relatedSkillNames) {
      const relatedSkill = skillsByName.get(skillName)
      if (!relatedSkill) throw new Error(`Ontology related drill skill missing: ${skillName}`)
      await graph.createEdge({ userId, sourceNodeId: drill.node_id, targetNodeId: relatedSkill.node_id, edgeType: 'practices' })
    }
  }
}
