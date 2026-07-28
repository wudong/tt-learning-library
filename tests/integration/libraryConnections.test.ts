import { expect, test } from 'bun:test'
import { LibraryConnectionsResponseSchema } from '@ttll/shared'
import { GraphRepository, createMigratedTestDb, provisionOntology } from '../../packages/db/src'
import { LibraryAggregateService } from '../../apps/api/src/services/libraryAggregateService'
import { VideoAggregateService } from '../../apps/api/src/services/videoAggregateService'
import { presentEdge, presentNode } from '../../apps/api/src/services/presenters'

async function createUser(db: Awaited<ReturnType<typeof createMigratedTestDb>>['db'], id: string) {
  const now = new Date().toISOString()
  await db.insertInto('users').values({ id, email: null, display_name: id, created_at: now, updated_at: now, deleted_at: null }).execute()
}

function presentConnections(result: Awaited<ReturnType<LibraryAggregateService['getNodeConnections']>>) {
  return {
    data: {
      center: presentNode(result.center),
      centerHref: result.centerHref,
      groups: result.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ node: presentNode(item.node), edge: presentEdge(item.edge), href: item.href })),
      })),
      maxNodes: result.maxNodes,
      totalConnections: result.totalConnections,
      shownConnections: result.shownConnections,
      truncated: result.truncated,
    },
  }
}

test('knowledge graph explorer groups direct connections and resolves detail links', async () => {
  const { db } = await createMigratedTestDb()
  const userId = 'user_graph_explorer'
  await createUser(db, userId)
  await provisionOntology(db, userId)

  const skill = await db.selectFrom('skills').selectAll().where('user_id', '=', userId).where('name', '=', 'Backspin Serve').where('deleted_at', 'is', null).executeTakeFirstOrThrow()
  const topic = await db.selectFrom('topics').selectAll().where('user_id', '=', userId).where('id', '=', skill.topic_id!).executeTakeFirstOrThrow()
  const library = new LibraryAggregateService(db)
  const video = await new VideoAggregateService(db).createVideo(userId, {
    sourceUrl: 'https://youtu.be/graph-explorer',
    title: 'Backspin contact explained',
    topicIds: [],
    skillIds: [skill.id],
    tagIds: [],
    progress: 'saved',
    learningState: 'practicing',
  })
  const drill = await library.createDrill(userId, { title: 'Backspin serve basket', skillNodeId: skill.node_id })
  const note = await library.createNote(userId, { parentNodeId: skill.node_id, body: 'Brush underneath the ball', noteType: 'takeaway' })

  const result = await library.getNodeConnections(userId, skill.node_id)
  expect(() => LibraryConnectionsResponseSchema.parse(presentConnections(result))).not.toThrow()
  expect(result.center.id).toBe(skill.node_id)
  expect(result.centerHref).toBe(`/library/skills/${skill.node_id}`)
  expect(result.totalConnections).toBeGreaterThan(4)

  const partOf = result.groups.find((group) => group.label === 'Part of')
  expect(partOf?.items[0]?.node.id).toBe(topic.node_id)
  expect(partOf?.items[0]?.href).toBe(`/library/topics/${topic.node_id}`)

  const explainedBy = result.groups.find((group) => group.label === 'Explained by')
  expect(explainedBy?.items[0]?.node.id).toBe(video.node.id)
  expect(explainedBy?.items[0]?.href).toBe(`/videos/${video.video.id}`)

  const practisedBy = result.groups.find((group) => group.label === 'Practised by')
  expect(practisedBy?.items.some((item) => item.node.id === drill.node_id)).toBe(true)

  const notes = result.groups.find((group) => group.label === 'Notes and mentions')
  expect(notes?.items[0]?.node.id).toBe(note.node_id)
  expect(notes?.items[0]?.href).toBeNull()

  expect(result.groups.some((group) => group.label === 'Notes and mentions')).toBe(true)
  expect(result.groups.every((group) => !group.label.startsWith('Through '))).toBe(true)

  const videoResult = await library.getNodeConnections(userId, video.node.id)
  expect(() => LibraryConnectionsResponseSchema.parse(presentConnections(videoResult))).not.toThrow()
  expect(videoResult.centerHref).toBe(`/videos/${video.video.id}`)
  expect(videoResult.groups.some((group) => group.label === 'Explains' && group.items.some((item) => item.node.id === skill.node_id))).toBe(true)

  await db.destroy()
})

test('symmetric related_to edges from both directions collapse into one Related items group', async () => {
  const { db } = await createMigratedTestDb()
  const userId = 'user_graph_related_merge'
  await createUser(db, userId)
  const now = new Date().toISOString()
  // Insert nodes with deterministic ids so we can control storage normalisation
  // (symmetric edges are stored with source < target). Center is 'node_b', so an edge
  // to 'node_a' reads as incoming and an edge to 'node_c' reads as outgoing.
  for (const id of ['node_a', 'node_b', 'node_c']) {
    await db.insertInto('graph_nodes').values({
      id, user_id: userId, node_type: 'skill', title: id, summary: null, visibility: 'private',
      created_at: now, updated_at: now, deleted_at: null,
    }).execute()
  }
  const graph = new GraphRepository(db)
  const library = new LibraryAggregateService(db)
  await graph.createEdge({ userId, sourceNodeId: 'node_b', targetNodeId: 'node_a', edgeType: 'related_to' })
  await graph.createEdge({ userId, sourceNodeId: 'node_b', targetNodeId: 'node_c', edgeType: 'related_to' })

  const result = await library.getNodeConnections(userId, 'node_b')
  expect(() => LibraryConnectionsResponseSchema.parse(presentConnections(result))).not.toThrow()
  const relatedGroups = result.groups.filter((group) => group.label === 'Related items')
  expect(relatedGroups.length).toBe(1)
  expect(relatedGroups[0]?.items.length).toBe(2)
  expect(relatedGroups[0]?.total).toBe(2)
  expect(result.groups.every((group) => !group.label.startsWith('Through '))).toBe(true)

  await db.destroy()
})

test('Backhand Chop is connected to foundations, defence, spin, contrasting attack, and drills', async () => {
  const { db } = await createMigratedTestDb()
  const userId = 'user_graph_backhand_chop'
  await createUser(db, userId)
  const library = new LibraryAggregateService(db)
  const overview = await library.getOverview(userId)
  const backhandChop = overview.skills.find((skill) => skill.name === 'Backhand Chop')!

  const result = await library.getNodeConnections(userId, backhandChop.node_id)
  expect(() => LibraryConnectionsResponseSchema.parse(presentConnections(result))).not.toThrow()
  const connectedTitles = new Set(result.groups.flatMap((group) => group.items.map((item) => item.node.title)))
  expect(connectedTitles.has('Backhand')).toBe(true)
  expect(connectedTitles.has('Racket Angle Control')).toBe(true)
  expect(connectedTitles.has('Reading Incoming Spin')).toBe(true)
  expect(connectedTitles.has('Generating Backspin')).toBe(true)
  expect(connectedTitles.has('Chop Defense')).toBe(true)
  expect(connectedTitles.has('Backhand Loop')).toBe(true)
  expect(connectedTitles.has('Backhand Chop Depth Control')).toBe(true)
  expect(result.totalConnections).toBeGreaterThanOrEqual(8)

  const resources = await library.getNodeResources(userId, backhandChop.node_id)
  expect(resources.node.summary).toContain('controlled backspin')
  expect(resources.drills.some((relatedDrill) => relatedDrill.title === 'Backhand Chop Depth Control')).toBe(true)

  await db.destroy()
})

test('knowledge graph explorer is owner-scoped, capped, and rejects unsupported centers', async () => {
  const { db } = await createMigratedTestDb()
  const userId = 'user_graph_explorer_cap'
  const otherUserId = 'user_graph_explorer_other'
  await createUser(db, userId)
  await createUser(db, otherUserId)

  const graph = new GraphRepository(db)
  const skill = await graph.createNode({ userId, nodeType: 'skill', title: 'Serve variation' })
  for (let index = 0; index < 40; index += 1) {
    const note = await graph.createNode({ userId, nodeType: 'note', title: `Observation ${index + 1}` })
    await graph.createEdge({ userId, sourceNodeId: note.id, targetNodeId: skill.id, edgeType: 'mentions' })
  }
  const otherNote = await graph.createNode({ userId: otherUserId, nodeType: 'note', title: 'Other player note' })
  const tag = await graph.createNode({ userId, nodeType: 'tag', title: 'Serve' })

  const result = await new LibraryAggregateService(db).getNodeConnections(userId, skill.id)
  expect(() => LibraryConnectionsResponseSchema.parse(presentConnections(result))).not.toThrow()
  expect(result.maxNodes).toBe(36)
  expect(result.totalConnections).toBe(40)
  expect(result.shownConnections).toBe(36)
  expect(result.truncated).toBe(true)
  expect(result.groups[0]?.total).toBe(40)
  expect(result.groups.flatMap((group) => group.items).some((item) => item.node.id === otherNote.id)).toBe(false)

  await expect(new LibraryAggregateService(db).getNodeConnections(otherUserId, skill.id)).rejects.toThrow('Explorable knowledge item not found')
  await expect(new LibraryAggregateService(db).getNodeConnections(userId, tag.id)).rejects.toThrow('Explorable knowledge item not found')

  await db.destroy()
})
