import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { GraphRepository, NoteDrillRepository, TopicSkillRepository, provisionOntology } from '@ttll/db'
import { NOTE_PARENT_NODE_TYPES, TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS } from '@ttll/shared'

export class LibraryAggregateService {
  constructor(private readonly db: Kysely<Database>) {}

  async getOverview(userId: string) {
    await provisionOntology(this.db, userId)
    const repository = new TopicSkillRepository(this.db)
    const [systemTopics, systemSkills] = await Promise.all([repository.listSystemTopics(userId), repository.listSystemSkills(userId)])
    const topics = systemTopics.filter((topic) => (TABLE_TENNIS_TOPICS as readonly string[]).includes(topic.name))
    const skills = systemSkills.filter((skill) => TABLE_TENNIS_SKILLS.some((definition) => definition.name === skill.name))
    const graph = new GraphRepository(this.db)
    const [topicNodeCounts, skillNodeCounts] = await Promise.all([
      graph.countIncomingVideos(userId, topics.map((topic) => topic.node_id), ['belongs_to']),
      graph.countIncomingVideos(userId, skills.map((skill) => skill.node_id), ['explains', 'demonstrates'])
    ])
    const topicCounts = topics.map((topic) => [topic.id, topicNodeCounts.get(topic.node_id) ?? 0] as const)
    const skillCounts = skills.map((skill) => [skill.id, skillNodeCounts.get(skill.node_id) ?? 0] as const)
    return { topics, skills, topicVideoCounts: Object.fromEntries(topicCounts), skillVideoCounts: Object.fromEntries(skillCounts) }
  }

  async createTopic(userId: string, input: { name: string; description?: string }) {
    return this.db.transaction().execute(async (trx) => {
      const node = await new GraphRepository(trx).createNode({ userId, nodeType: 'topic', title: input.name, summary: input.description ?? null })
      return new TopicSkillRepository(trx).createTopic({ userId, nodeId: node.id, name: input.name, description: input.description })
    })
  }

  async createSkill(userId: string, input: { name: string; topicId?: string; difficulty?: string; status?: string }) {
    return this.db.transaction().execute(async (trx) => {
      const graph = new GraphRepository(trx)
      const topic = input.topicId ? await new TopicSkillRepository(trx).getTopic(userId, input.topicId) : undefined
      if (input.topicId && !topic) throw new Error('NOT_FOUND: Topic not found')
      const node = await graph.createNode({ userId, nodeType: 'skill', title: input.name })
      const skill = await new TopicSkillRepository(trx).createSkill({ userId, nodeId: node.id, name: input.name, topicId: input.topicId, difficulty: input.difficulty, status: input.status })
      if (topic) {
        await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: topic.node_id, edgeType: 'belongs_to' })
      }
      return skill
    })
  }

  async createNote(userId: string, input: { parentNodeId: string; body: string; noteType: string; timestampSeconds?: number }) {
    return this.db.transaction().execute(async (trx) => {
      const graph = new GraphRepository(trx)
      const parent = await graph.getNode(userId, input.parentNodeId)
      if (!parent) throw new Error('NOT_FOUND: Parent not found')
      if (!(NOTE_PARENT_NODE_TYPES as readonly string[]).includes(parent.node_type)) throw new Error(`VALIDATION_ERROR: Notes cannot attach to ${parent.node_type}`)
      const node = await graph.createNode({ userId, nodeType: 'note', title: input.body.slice(0, 80), summary: input.body })
      const note = await new NoteDrillRepository(trx).createNote({ userId, nodeId: node.id, parentNodeId: parent.id, body: input.body, noteType: input.noteType, timestampSeconds: input.timestampSeconds })
      await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: parent.id, edgeType: 'mentions' })
      return note
    })
  }

  async createDrill(userId: string, input: { title: string; description?: string; skillNodeId?: string; videoNodeId?: string }) {
    return this.db.transaction().execute(async (trx) => {
      const graph = new GraphRepository(trx)
      const node = await graph.createNode({ userId, nodeType: 'drill', title: input.title, summary: input.description ?? null })
      const drill = await new NoteDrillRepository(trx).createDrill({ userId, nodeId: node.id, title: input.title, description: input.description })
      if (input.skillNodeId) await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: input.skillNodeId, edgeType: 'drill_for' })
      if (input.videoNodeId) await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: input.videoNodeId, edgeType: 'drill_for' })
      return drill
    })
  }
}
