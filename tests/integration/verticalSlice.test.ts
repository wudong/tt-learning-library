import { expect, test } from 'bun:test'
import { createMigratedTestDb } from '../../packages/db/src'
import { InboxCaptureService } from '../../apps/api/src/services/inboxCaptureService'
import { VideoAggregateService } from '../../apps/api/src/services/videoAggregateService'
import type { VideoMetadataProvider } from '../../apps/api/src/services/youtubeMetadataService'
import { GraphRepository } from '../../packages/db/src'
import { LibraryAggregateService } from '../../apps/api/src/services/libraryAggregateService'

test('manual capture converts to graph-backed video idempotently', async () => {
  const { db } = await createMigratedTestDb()
  await db.insertInto('users').values({ id: 'user_test', email: null, display_name: 'Test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null }).execute()
  const inbox = await new InboxCaptureService(db).capture('user_test', { sourceUrl: 'https://youtu.be/abc123', sharedTitle: 'Serve tutorial' })
  const first = await new VideoAggregateService(db).convertInboxItemToVideo('user_test', inbox.id, { title: 'Serve tutorial', topicIds: [], skillIds: [], tagIds: [], progress: 'saved', learningState: 'revisit' })
  const second = await new VideoAggregateService(db).convertInboxItemToVideo('user_test', inbox.id, { topicIds: [], skillIds: [], tagIds: [], progress: 'saved', learningState: 'none' })
  expect(first.video.node_id).toBe(second.video.node_id)
  expect(second.alreadyConverted).toBe(true)
  await db.destroy()
})

test('YouTube capture persists metadata and carries it into the video', async () => {
  const { db } = await createMigratedTestDb()
  await db.insertInto('users').values({ id: 'user_metadata', email: null, display_name: 'Metadata', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null }).execute()
  const provider: VideoMetadataProvider = { fetch: async () => ({ title: 'Fetched Serve Tutorial', creatorName: 'TT Coach', thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' }) }
  const inbox = await new InboxCaptureService(db, provider).capture('user_metadata', { sourceUrl: 'https://youtu.be/abc123' })
  expect(inbox.shared_title).toBe('Fetched Serve Tutorial')
  expect(inbox.creator_name).toBe('TT Coach')
  expect(inbox.thumbnail_url).toContain('i.ytimg.com')
  const converted = await new VideoAggregateService(db).convertInboxItemToVideo('user_metadata', inbox.id, { topicIds: [], skillIds: [], tagIds: [], progress: 'saved', learningState: 'none' })
  expect(converted.video.title).toBe('Fetched Serve Tutorial')
  expect(converted.video.creator_name).toBe('TT Coach')
  expect(converted.video.thumbnail_url).toBe(inbox.thumbnail_url)
  await db.destroy()
})

test('metadata failure does not block durable capture and shared title wins', async () => {
  const { db } = await createMigratedTestDb()
  await db.insertInto('users').values({ id: 'user_fallback', email: null, display_name: 'Fallback', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null }).execute()
  const missing: VideoMetadataProvider = { fetch: async () => null }
  const failed = await new InboxCaptureService(db, missing).capture('user_fallback', { sourceUrl: 'https://youtu.be/abc123' })
  expect(failed.source_platform).toBe('youtube')
  expect(failed.thumbnail_url).toBeNull()
  const available: VideoMetadataProvider = { fetch: async () => ({ title: 'Fetched title', creatorName: 'Coach', thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' }) }
  const titled = await new InboxCaptureService(db, available).capture('user_fallback', { sourceUrl: 'https://youtu.be/def456', sharedTitle: 'My title' })
  expect(titled.shared_title).toBe('My title')
  expect(titled.thumbnail_url).toContain('i.ytimg.com')
  await db.destroy()
})

test('duplicate conversion backfills missing metadata without overwriting title', async () => {
  const { db } = await createMigratedTestDb()
  await db.insertInto('users').values({ id: 'user_duplicate', email: null, display_name: 'Duplicate', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null }).execute()
  const videos = new VideoAggregateService(db)
  const existing = await videos.createVideo('user_duplicate', { sourceUrl: 'https://youtu.be/abc123', title: 'My chosen title', topicIds: [], skillIds: [], tagIds: [], progress: 'saved', learningState: 'none' })
  const provider: VideoMetadataProvider = { fetch: async () => ({ title: 'Provider title', creatorName: 'TT Coach', thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' }) }
  const inbox = await new InboxCaptureService(db, provider).capture('user_duplicate', { sourceUrl: 'https://www.youtube.com/watch?v=abc123' })
  const converted = await videos.convertInboxItemToVideo('user_duplicate', inbox.id, { topicIds: [], skillIds: [], tagIds: [], progress: 'saved', learningState: 'none' })
  expect(converted.alreadyExisting).toBe(true)
  expect(converted.video.id).toBe(existing.video.id)
  expect(converted.video.title).toBe('My chosen title')
  expect(converted.video.creator_name).toBe('TT Coach')
  expect(converted.video.thumbnail_url).toContain('i.ytimg.com')
  await db.destroy()
})

test('graph traversal includes incoming and outgoing relationships and excludes deleted nodes', async () => {
  const { db } = await createMigratedTestDb()
  const now = new Date().toISOString()
  await db.insertInto('users').values([
    { id: 'user_graph', email: null, display_name: 'Graph', created_at: now, updated_at: now, deleted_at: null },
    { id: 'user_other', email: null, display_name: 'Other', created_at: now, updated_at: now, deleted_at: null }
  ]).execute()
  const graph = new GraphRepository(db)
  const video = await graph.createNode({ userId: 'user_graph', nodeType: 'video', title: 'Serve video' })
  const skill = await graph.createNode({ userId: 'user_graph', nodeType: 'skill', title: 'Backspin serve' })
  const other = await graph.createNode({ userId: 'user_other', nodeType: 'skill', title: 'Private skill' })
  const edge = await graph.createEdge({ userId: 'user_graph', sourceNodeId: video.id, targetNodeId: skill.id, edgeType: 'explains' })
  const duplicate = await graph.createEdge({ userId: 'user_graph', sourceNodeId: video.id, targetNodeId: skill.id, edgeType: 'explains' })
  expect(duplicate.id).toBe(edge.id)
  expect((await graph.relationships('user_graph', video.id))[0]?.direction).toBe('outgoing')
  expect((await graph.relationships('user_graph', skill.id))[0]?.direction).toBe('incoming')
  expect((await graph.related('user_graph', skill.id))[0]?.id).toBe(video.id)
  await expect(graph.createEdge({ userId: 'user_graph', sourceNodeId: video.id, targetNodeId: other.id, edgeType: 'explains' })).rejects.toThrow('NOT_FOUND')
  await graph.softDeleteNode('user_graph', video.id)
  expect(await graph.relationships('user_graph', skill.id)).toEqual([])
  await db.destroy()
})

test('note graph/domain/edge creation is atomic and rolls back invalid relationships', async () => {
  const { db } = await createMigratedTestDb()
  const now = new Date().toISOString()
  await db.insertInto('users').values({ id: 'user_atomic', email: null, display_name: 'Atomic', created_at: now, updated_at: now, deleted_at: null }).execute()
  const graph = new GraphRepository(db)
  const video = await graph.createNode({ userId: 'user_atomic', nodeType: 'video', title: 'Serve video' })
  const tag = await graph.createNode({ userId: 'user_atomic', nodeType: 'tag', title: 'Serve' })
  const service = new LibraryAggregateService(db)
  const note = await service.createNote('user_atomic', { parentNodeId: video.id, body: 'Contact the ball lower', noteType: 'plain' })
  const noteNode = await graph.getNode('user_atomic', note.node_id)
  const relationships = await graph.relationships('user_atomic', note.node_id)
  expect(noteNode?.node_type).toBe('note')
  expect(relationships[0]?.edge.edge_type).toBe('mentions')
  expect(relationships[0]?.node.id).toBe(video.id)
  const beforeNotes = Number((await db.selectFrom('notes').select((eb) => eb.fn.countAll().as('count')).executeTakeFirst())?.count ?? 0)
  await expect(service.createNote('user_atomic', { parentNodeId: tag.id, body: 'Invalid parent', noteType: 'plain' })).rejects.toThrow('Notes cannot attach to tag')
  const afterNotes = Number((await db.selectFrom('notes').select((eb) => eb.fn.countAll().as('count')).executeTakeFirst())?.count ?? 0)
  const invalidNode = await db.selectFrom('graph_nodes').select('id').where('user_id', '=', 'user_atomic').where('title', '=', 'Invalid parent').executeTakeFirst()
  expect(afterNotes).toBe(beforeNotes)
  expect(invalidNode).toBeUndefined()
  await db.destroy()
})
