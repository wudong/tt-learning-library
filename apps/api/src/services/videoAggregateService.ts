import type { Kysely, Transaction } from 'kysely'
import type { Database, Row } from '@ttll/db'
import { GraphRepository, InboxRepository, NoteDrillRepository, VideoRepository, canonicalizeUrl } from '@ttll/db'
import type { ConvertInboxRequest, CreateVideoRequest, EdgeType } from '@ttll/shared'

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
      return { video, node: node!, createdEdges: [], createdNote: null, alreadyConverted: false, alreadyExisting: true }
    }
    const graph = new GraphRepository(conn)
    const node = await graph.createNode({ userId, nodeType: 'video', title: input.title ?? identity.canonicalUrl })
    const video = await videos.create({ userId, nodeId: node.id, sourceUrl: identity.sourceUrl, canonicalUrl: identity.canonicalUrl, sourcePlatform: identity.sourcePlatform, externalId: identity.externalId, title: input.title ?? null, thumbnailUrl: input.thumbnailUrl, creatorName: input.creatorName, progress: input.progress, learningState: input.learningState })
    const createdEdges = []
    for (const target of input.skillIds) createdEdges.push(await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: target, edgeType: 'explains' }))
    for (const target of input.topicIds) {
      try {
        createdEdges.push(await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: target, edgeType: 'belongs_to' as EdgeType }))
      } catch {
        createdEdges.push(await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: target, edgeType: 'related_to' }))
      }
    }
    for (const target of input.tagIds) createdEdges.push(await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: target, edgeType: 'tagged_with' }))
    return { video, node, createdEdges, createdNote: null, alreadyConverted: false, alreadyExisting: false }
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
