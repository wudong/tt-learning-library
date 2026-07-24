import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { GraphRepository, NoteDrillRepository, TopicSkillRepository, VideoRepository, provisionOntology } from '@ttll/db'
import {
  NOTE_PARENT_NODE_TYPES,
  TABLE_TENNIS_DRILLS,
  TABLE_TENNIS_SKILLS,
  TABLE_TENNIS_TOPICS,
  type EdgeType,
  type NodeType,
} from '@ttll/shared'

const CONNECTION_LIMIT = 24
const EXPLORABLE_NODE_TYPES = new Set<NodeType>(['topic', 'skill', 'video', 'drill'])

const CONNECTION_GROUP_ORDER: EdgeType[] = [
  'belongs_to', 'contains', 'prerequisite_of', 'requires', 'explains', 'demonstrates',
  'practices', 'drill_for', 'mentions', 'common_mistake_for', 'enables', 'related_to',
  'contrasts_with', 'tagged_with', 'saved_from', 'created_by', 'copied_from', 'forked_from',
]

const CONNECTION_LABELS: Record<EdgeType, { outgoing: string; incoming: string }> = {
  belongs_to: { outgoing: 'Part of', incoming: 'Contains' },
  contains: { outgoing: 'Contains', incoming: 'Part of' },
  explains: { outgoing: 'Explains', incoming: 'Explained by' },
  demonstrates: { outgoing: 'Demonstrates', incoming: 'Demonstrated by' },
  practices: { outgoing: 'Practises', incoming: 'Practised by' },
  drill_for: { outgoing: 'Uses for practice', incoming: 'Used by drills' },
  related_to: { outgoing: 'Related items', incoming: 'Related items' },
  requires: { outgoing: 'Requires', incoming: 'Required by' },
  prerequisite_of: { outgoing: 'Prerequisite for', incoming: 'Prerequisites' },
  common_mistake_for: { outgoing: 'Common mistake for', incoming: 'Common mistakes' },
  enables: { outgoing: 'Enables', incoming: 'Enabled by' },
  mentions: { outgoing: 'Mentions', incoming: 'Notes and mentions' },
  contrasts_with: { outgoing: 'Contrasts with', incoming: 'Contrasts with' },
  saved_from: { outgoing: 'Saved from', incoming: 'Saved items' },
  created_by: { outgoing: 'Created by', incoming: 'Created items' },
  tagged_with: { outgoing: 'Tagged with', incoming: 'Tagged items' },
  copied_from: { outgoing: 'Copied from', incoming: 'Copies' },
  forked_from: { outgoing: 'Forked from', incoming: 'Forks' },
}

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

  async getNodeConnections(userId: string, nodeId: string) {
    const graph = new GraphRepository(this.db)
    const center = await graph.getNode(userId, nodeId)
    if (!center || !EXPLORABLE_NODE_TYPES.has(center.node_type as NodeType)) throw new Error('NOT_FOUND: Explorable knowledge item not found')

    const relationships = await graph.relationships(userId, nodeId)
    const nodeIds = [...new Set([center.id, ...relationships.map((relationship) => relationship.node.id)])]
    const [videos, sessions] = await Promise.all([
      new VideoRepository(this.db).listByNodeIds(userId, nodeIds),
      this.db.selectFrom('practice_sessions').select(['id', 'node_id'])
        .where('user_id', '=', userId).where('node_id', 'in', nodeIds).where('deleted_at', 'is', null).execute(),
    ])
    const videoIds = new Map(videos.map((video) => [video.node_id, video.id]))
    const sessionIds = new Map(sessions.map((session) => [session.node_id, session.id]))
    const hrefFor = (node: typeof center): string | null => {
      if (node.node_type === 'topic') return `/library/topics/${node.id}`
      if (node.node_type === 'skill') return `/library/skills/${node.id}`
      if (node.node_type === 'drill') return `/library/drills/${node.id}`
      if (node.node_type === 'video') return videoIds.has(node.id) ? `/videos/${videoIds.get(node.id)}` : null
      if (node.node_type === 'practice_session') return sessionIds.has(node.id) ? `/training/${sessionIds.get(node.id)}` : null
      return null
    }

    const ordered = [...relationships].sort((left, right) => {
      const leftEdge = left.edge.edge_type as EdgeType
      const rightEdge = right.edge.edge_type as EdgeType
      const edgeDifference = CONNECTION_GROUP_ORDER.indexOf(leftEdge) - CONNECTION_GROUP_ORDER.indexOf(rightEdge)
      if (edgeDifference) return edgeDifference
      const directionDifference = left.direction.localeCompare(right.direction)
      if (directionDifference) return directionDifference
      const typeDifference = left.node.node_type.localeCompare(right.node.node_type)
      if (typeDifference) return typeDifference
      const titleDifference = left.node.title.localeCompare(right.node.title)
      return titleDifference || left.edge.id.localeCompare(right.edge.id)
    })
    const shown = ordered.slice(0, CONNECTION_LIMIT)
    const totals = new Map<string, number>()
    for (const relationship of ordered) {
      const key = `${relationship.edge.edge_type}:${relationship.direction}`
      totals.set(key, (totals.get(key) ?? 0) + 1)
    }

    const groups = new Map<string, {
      key: string
      edgeType: EdgeType
      direction: 'incoming'|'outgoing'
      label: string
      total: number
      items: Array<{ node: typeof center; edge: typeof relationships[number]['edge']; href: string | null }>
    }>()
    for (const relationship of shown) {
      const edgeType = relationship.edge.edge_type as EdgeType
      const direction = relationship.direction
      const key = `${edgeType}:${direction}`
      const group = groups.get(key) ?? {
        key,
        edgeType,
        direction,
        label: CONNECTION_LABELS[edgeType][direction],
        total: totals.get(key) ?? 0,
        items: [],
      }
      group.items.push({ node: relationship.node, edge: relationship.edge, href: hrefFor(relationship.node) })
      groups.set(key, group)
    }

    return {
      center,
      centerHref: hrefFor(center),
      groups: [...groups.values()],
      maxNodes: CONNECTION_LIMIT,
      totalConnections: ordered.length,
      shownConnections: shown.length,
      truncated: ordered.length > shown.length,
    }
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
