import type { Kysely, Transaction } from 'kysely'
import type { Database, Row } from '@ttll/db'
import { GraphRepository, InboxRepository, NoteDrillRepository, ShareRepository, TagRepository, TopicSkillRepository, VideoRepository, canonicalizeUrl } from '@ttll/db'
import { TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS, type ConvertInboxRequest, type CreateVideoRequest, type UpdateVideoLearningContextRequest } from '@ttll/shared'

type Conn = Kysely<Database> | Transaction<Database>
type EnrichedVideoInput = CreateVideoRequest & { thumbnailUrl?: string | null; creatorName?: string | null }

export class VideoAggregateService {
  constructor(private readonly db: Kysely<Database>) {}

  async createVideo(userId: string, input: CreateVideoRequest) {
    return this.db.transaction().execute(async (trx) => {
      return this.doCreateVideo(trx, userId, input)
    })
  }

  private async doCreateVideo(conn: Conn, userId: string, input: EnrichedVideoInput) {
    const identity = canonicalizeUrl(input.sourceUrl)
    const videos = new VideoRepository(conn)
    const duplicate = await videos.findDuplicate(userId, identity)
    if (duplicate) {
      const graph = new GraphRepository(conn)
      let video = duplicate
      const metadataPatch = {
        ...(duplicate.title ? {} : input.title ? { title: input.title } : {}),
        ...(duplicate.thumbnail_url ? {} : input.thumbnailUrl ? { thumbnail_url: input.thumbnailUrl } : {}),
        ...(duplicate.creator_name ? {} : input.creatorName ? { creator_name: input.creatorName } : {})
      }
      if (Object.keys(metadataPatch).length) video = await videos.patchMetadata(userId, duplicate.id, metadataPatch)
      let node = await graph.getNode(userId, duplicate.node_id)
      if (node && input.title && node.title === duplicate.canonical_url) node = await graph.updateNode(userId, node.id, { title: input.title })
      const createdEdges = await this.createRequestedEdges(conn, userId, node!.id, input)
      return { video, node: node!, createdEdges, createdNote: null, alreadyConverted: false, alreadyExisting: true }
    }
    const graph = new GraphRepository(conn)
    const node = await graph.createNode({ userId, nodeType: 'video', title: input.title ?? identity.canonicalUrl })
    const video = await videos.create({ userId, nodeId: node.id, sourceUrl: identity.sourceUrl, canonicalUrl: identity.canonicalUrl, sourcePlatform: identity.sourcePlatform, externalId: identity.externalId, title: input.title ?? null, thumbnailUrl: input.thumbnailUrl, creatorName: input.creatorName, progress: input.progress, learningState: input.learningState })
    const createdEdges = await this.createRequestedEdges(conn, userId, node.id, input)
    return { video, node, createdEdges, createdNote: null, alreadyConverted: false, alreadyExisting: false }
  }

  private async createRequestedEdges(conn: Conn, userId: string, videoNodeId: string, input: EnrichedVideoInput) {
    const createdEdges = []
    const graph = new GraphRepository(conn)
    const library = new TopicSkillRepository(conn)
    const skillIds = [...new Set(input.skillIds)]
    const topicIds = [...new Set(input.topicIds)]
    const tagIds = [...new Set(input.tagIds)]
    if (skillIds.length !== input.skillIds.length) throw new Error('VALIDATION_ERROR: Each skill can be linked once')
    if (topicIds.length !== input.topicIds.length) throw new Error('VALIDATION_ERROR: Each topic can be linked once')
    if (tagIds.length !== input.tagIds.length) throw new Error('VALIDATION_ERROR: Each tag can be linked once')
    const [skills, topics, tags] = await Promise.all([
      library.getSkills(userId, skillIds),
      library.getTopics(userId, topicIds),
      new TagRepository(conn).getTags(userId, tagIds)
    ])
    if (skills.length !== skillIds.length) throw new Error('NOT_FOUND: Skill not found')
    if (topics.length !== topicIds.length) throw new Error('NOT_FOUND: Topic not found')
    if (tags.length !== tagIds.length) throw new Error('NOT_FOUND: Tag not found')
    if (skills.some((skill) => skill.is_system !== 1 || !TABLE_TENNIS_SKILLS.some((definition) => definition.name === skill.name))) throw new Error('VALIDATION_ERROR: Skill is not part of the curated ontology')
    if (topics.some((topic) => topic.is_system !== 1 || !(TABLE_TENNIS_TOPICS as readonly string[]).includes(topic.name))) throw new Error('VALIDATION_ERROR: Topic is not part of the curated ontology')
    for (const target of skills) createdEdges.push(await graph.createEdge({ userId, sourceNodeId: videoNodeId, targetNodeId: target.node_id, edgeType: 'explains' }))
    for (const target of topics) createdEdges.push(await graph.createEdge({ userId, sourceNodeId: videoNodeId, targetNodeId: target.node_id, edgeType: 'belongs_to' }))
    for (const target of tags) createdEdges.push(await graph.createEdge({ userId, sourceNodeId: videoNodeId, targetNodeId: target.node_id, edgeType: 'tagged_with' }))
    return createdEdges
  }

  async updateLearningContext(userId: string, videoId: string, input: UpdateVideoLearningContextRequest) {
    return this.db.transaction().execute(async (trx) => {
      const video = await new VideoRepository(trx).getById(userId, videoId)
      if (!video) throw new Error('NOT_FOUND: Video not found')
      const library = new TopicSkillRepository(trx)
      const topicIds = [...new Set(input.topicIds)]
      const skillIds = [...new Set(input.skills.map((link) => link.skillId))]
      if (skillIds.length !== input.skills.length) throw new Error('VALIDATION_ERROR: Each skill can be linked once')
      const [topics, skills] = await Promise.all([library.getTopics(userId, topicIds), library.getSkills(userId, skillIds)])
      if (topics.length !== topicIds.length) throw new Error('NOT_FOUND: Topic not found')
      if (skills.length !== skillIds.length) throw new Error('NOT_FOUND: Skill not found')
      if (skills.some((skill) => skill.is_system !== 1 || !TABLE_TENNIS_SKILLS.some((definition) => definition.name === skill.name))) throw new Error('VALIDATION_ERROR: Skill is not part of the curated ontology')
      if (topics.some((topic) => topic.is_system !== 1 || !(TABLE_TENNIS_TOPICS as readonly string[]).includes(topic.name))) throw new Error('VALIDATION_ERROR: Topic is not part of the curated ontology')
      const graph = new GraphRepository(trx)
      await graph.softDeleteEdges(userId, video.node_id, ['belongs_to', 'explains', 'demonstrates'])
      for (const topic of topics) await graph.createEdge({ userId, sourceNodeId: video.node_id, targetNodeId: topic.node_id, edgeType: 'belongs_to' })
      const skillsById = new Map(skills.map((skill) => [skill.id, skill]))
      for (const link of input.skills) {
        await graph.createEdge({ userId, sourceNodeId: video.node_id, targetNodeId: skillsById.get(link.skillId)!.node_id, edgeType: link.relationship })
      }
      return this.getVideoDetail(userId, videoId, trx)
    })
  }

  async deleteVideo(userId: string, videoId: string) {
    return this.db.transaction().execute(async (trx) => {
      const video = await new VideoRepository(trx).softDelete(userId, videoId)
      await new GraphRepository(trx).softDeleteNode(userId, video.node_id)
      await new ShareRepository(trx).revokeForNode(userId, video.node_id)
      return { deleted: true as const }
    })
  }

  async getVideoDetail(userId: string, videoId: string, conn: Conn = this.db) {
    const video = await new VideoRepository(conn).getById(userId, videoId)
    if (!video) return undefined
    const graph = new GraphRepository(conn)
    const node = await graph.getNode(userId, video.node_id)
    if (!node) return undefined
    const relationships = await graph.relationships(userId, video.node_id)
    const nodes = (types: string[], edgeTypes?: string[]) => relationships
      .filter(({ node: related, edge }) => types.includes(related.node_type) && (!edgeTypes || edgeTypes.includes(edge.edge_type)))
      .map(({ node: related }) => related)
    const skillLinks = relationships.filter(({ direction, node: related, edge }) => direction === 'outgoing' && related.node_type === 'skill' && ['explains', 'demonstrates'].includes(edge.edge_type))
    return {
      video, node,
      topics: nodes(['topic'], ['belongs_to']),
      skills: skillLinks.map(({ node: related }) => related),
      skillRelationships: Object.fromEntries(skillLinks.map(({ node: related, edge }) => [related.id, edge.edge_type])),
      tags: nodes(['tag'], ['tagged_with']),
      notes: nodes(['note'], ['mentions']),
      drills: nodes(['drill'], ['drill_for']),
      related: nodes(['video', 'skill', 'topic', 'drill'], ['related_to', 'contrasts_with']),
      learningPaths: nodes(['learning_path'], ['contains'])
    }
  }

  async convertInboxItemToVideo(userId: string, inboxId: string, input: ConvertInboxRequest) {
    return this.db.transaction().execute(async (trx) => {
      const inboxRepo = new InboxRepository(trx)
      const inbox = await inboxRepo.get(userId, inboxId)
      if (!inbox) throw new Error('NOT_FOUND')
      if (inbox.converted_node_id) {
        const existing = await new VideoRepository(trx).getByNodeId(userId, inbox.converted_node_id)
        const node = await new GraphRepository(trx).getNode(userId, inbox.converted_node_id)
        if (!existing || !node) throw new Error('NOT_FOUND')
        return { video: existing, node, createdEdges: [], createdNote: null, alreadyConverted: true }
      }
      const sourceUrl = inbox.source_url
      if (!sourceUrl) throw new Error('VALIDATION_ERROR: Inbox item has no valid URL')
      const aggregate = await this.doCreateVideo(trx, userId, { sourceUrl, title: input.title ?? inbox.shared_title ?? undefined, thumbnailUrl: inbox.thumbnail_url, creatorName: inbox.creator_name, topicIds: input.topicIds, skillIds: input.skillIds, tagIds: input.tagIds, progress: input.progress, learningState: input.learningState })
      // Mark inbox as converted even when the video already existed (idempotency §8.14)
      if ((aggregate as any).alreadyExisting) {
        await inboxRepo.markConverted(userId, inboxId, aggregate.node.id)
      }
      let createdNote: Row<'graph_nodes'> | null = null
      if (input.quickNote) {
        const graph = new GraphRepository(trx)
        const noteNode = await graph.createNode({ userId, nodeType: 'note', title: input.quickNote.slice(0, 80), summary: input.quickNote })
        await new NoteDrillRepository(trx).createNote({ userId, nodeId: noteNode.id, parentNodeId: aggregate.node.id, body: input.quickNote })
        await graph.createEdge({ userId, sourceNodeId: noteNode.id, targetNodeId: aggregate.node.id, edgeType: 'mentions' })
        createdNote = noteNode
      }
      await inboxRepo.markConverted(userId, inboxId, aggregate.node.id)
      return { ...aggregate, createdNote }
    })
  }
}
