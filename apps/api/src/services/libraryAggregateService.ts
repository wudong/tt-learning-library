import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { GraphRepository, NoteDrillRepository, TopicSkillRepository, VideoRepository, provisionOntology } from '@ttll/db'
import { NOTE_PARENT_NODE_TYPES, TABLE_TENNIS_DRILLS, TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS } from '@ttll/shared'

export class LibraryAggregateService {
  constructor(private readonly db: Kysely<Database>) {}

  async getOverview(userId: string) {
    const repository = new TopicSkillRepository(this.db)
    const drillRepository = new NoteDrillRepository(this.db)
    let [systemTopics, systemSkills, drills] = await Promise.all([
      repository.listSystemTopics(userId),
      repository.listSystemSkills(userId),
      drillRepository.listDrills(userId),
    ])

    const ontologyIsCurrent = TABLE_TENNIS_TOPICS.every((name) => systemTopics.some((topic) => topic.name === name))
      && TABLE_TENNIS_SKILLS.every((definition) => systemSkills.some((skill) => skill.name === definition.name))
      && TABLE_TENNIS_DRILLS.every((definition) => drills.some((drill) => drill.is_system === 1 && drill.title === definition.title))

    if (!ontologyIsCurrent) {
      await provisionOntology(this.db, userId)
      ;[systemTopics, systemSkills, drills] = await Promise.all([
        repository.listSystemTopics(userId),
        repository.listSystemSkills(userId),
        drillRepository.listDrills(userId),
      ])
    }

    const topics = systemTopics.filter((topic) => (TABLE_TENNIS_TOPICS as readonly string[]).includes(topic.name))
    const skills = systemSkills.filter((skill) => TABLE_TENNIS_SKILLS.some((definition) => definition.name === skill.name))
    const graph = new GraphRepository(this.db)
    const [topicNodeCounts, skillNodeCounts] = await Promise.all([
      graph.countIncomingVideos(userId, topics.map((topic) => topic.node_id), ['belongs_to']),
      graph.countIncomingVideos(userId, skills.map((skill) => skill.node_id), ['explains', 'demonstrates'])
    ])
    const topicCounts = topics.map((topic) => [topic.id, topicNodeCounts.get(topic.node_id) ?? 0] as const)
    const skillCounts = skills.map((skill) => [skill.id, skillNodeCounts.get(skill.node_id) ?? 0] as const)
    return { topics, skills, drills, topicVideoCounts: Object.fromEntries(topicCounts), skillVideoCounts: Object.fromEntries(skillCounts) }
  }

  async getNodeResources(userId: string, nodeId: string) {
    const graph = new GraphRepository(this.db)
    const node = await graph.getNode(userId, nodeId)
    if (!node || !['topic', 'skill', 'drill'].includes(node.node_type)) throw new Error('NOT_FOUND: Library item not found')
    const related = await graph.related(userId, nodeId, ['belongs_to', 'explains', 'demonstrates', 'drill_for', 'practices'])
    const videoNodeIds = related.filter((item) => item.node_type === 'video').map((item) => item.id)
    const drillNodeIds = related.filter((item) => item.node_type === 'drill').map((item) => item.id)
    const drillRepository = new NoteDrillRepository(this.db)
    const [videos, drillRows, selectedDrill] = await Promise.all([
      new VideoRepository(this.db).listByNodeIds(userId, videoNodeIds),
      drillRepository.listDrillsByNodeIds(userId, drillNodeIds),
      node.node_type === 'drill' ? drillRepository.getDrillByNodeId(userId, nodeId) : Promise.resolve(undefined),
    ])
    const preference = node.node_type === 'topic'
      ? await this.db.selectFrom('topics').select('is_pinned').where('user_id', '=', userId).where('node_id', '=', nodeId).executeTakeFirst()
      : node.node_type === 'skill'
        ? await this.db.selectFrom('skills').select('is_pinned').where('user_id', '=', userId).where('node_id', '=', nodeId).executeTakeFirst()
        : await this.db.selectFrom('drills').select('is_pinned').where('user_id', '=', userId).where('node_id', '=', nodeId).executeTakeFirst()
    const drillSteps = selectedDrill ? await drillRepository.listSteps(userId, selectedDrill.id) : []
    return { node, videos, skills: related.filter((item) => item.node_type === 'skill'), drills: drillRows, drill: selectedDrill, drillSteps, isPinned: preference?.is_pinned === 1 }
  }

  async setPinned(userId: string, nodeId: string, pinned: boolean) {
    const node = await new GraphRepository(this.db).getNode(userId, nodeId)
    if (!node || !['topic', 'skill', 'drill'].includes(node.node_type)) throw new Error('NOT_FOUND: Library item not found')
    if (node.node_type === 'drill') await new NoteDrillRepository(this.db).setPinnedByNode(userId, nodeId, pinned)
    else await new TopicSkillRepository(this.db).setPinnedByNode(userId, nodeId, pinned)
    return { nodeId, pinned }
  }

  async attachVideo(userId: string, nodeId: string, videoId: string) {
    return this.db.transaction().execute(async (trx) => {
      const graph = new GraphRepository(trx)
      const [target, video] = await Promise.all([graph.getNode(userId, nodeId), new VideoRepository(trx).getById(userId, videoId)])
      if (!target || !['skill', 'drill'].includes(target.node_type)) throw new Error('NOT_FOUND: Library item not found')
      if (!video) throw new Error('NOT_FOUND: Video not found')
      const edge = target.node_type === 'skill'
        ? await graph.createEdge({ userId, sourceNodeId: video.node_id, targetNodeId: target.id, edgeType: 'explains' })
        : await graph.createEdge({ userId, sourceNodeId: target.id, targetNodeId: video.node_id, edgeType: 'drill_for' })
      return { edge, video }
    })
  }

  async linkPersonalDrillToSkill(userId: string, drillNodeId: string, skillNodeId: string) {
    return this.db.transaction().execute(async (trx) => {
      const graph = new GraphRepository(trx)
      const [drillNode, skillNode, drill] = await Promise.all([
        graph.getNode(userId, drillNodeId),
        graph.getNode(userId, skillNodeId),
        trx.selectFrom('drills').select(['id', 'is_system']).where('user_id', '=', userId).where('node_id', '=', drillNodeId).where('deleted_at', 'is', null).executeTakeFirst(),
      ])
      if (!drillNode || drillNode.node_type !== 'drill' || !drill) throw new Error('NOT_FOUND: Drill not found')
      if (drill.is_system === 1) throw new Error('VALIDATION_ERROR: Starter Drill links are protected')
      if (!skillNode || skillNode.node_type !== 'skill') throw new Error('NOT_FOUND: Skill not found')
      return graph.createEdge({ userId, sourceNodeId: drillNodeId, targetNodeId: skillNodeId, edgeType: 'practices' })
    })
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
      if (input.skillNodeId) await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: input.skillNodeId, edgeType: 'practices' })
      if (input.videoNodeId) await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: input.videoNodeId, edgeType: 'drill_for' })
      return drill
    })
  }

  async createDrillFromDescription(userId: string, description: string) {
    const normalized = description.trim().replace(/\s+/g, ' ')
    const firstThought = normalized.split(/(?<=[.!?])\s/, 1)[0] ?? normalized
    const title = firstThought.length <= 80 ? firstThought : `${firstThought.slice(0, 77).trimEnd()}…`
    return this.createDrill(userId, { title, description: normalized })
  }
}
