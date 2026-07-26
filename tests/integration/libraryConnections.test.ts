import { expect, test } from 'bun:test'
import { GraphRepository, createMigratedTestDb, provisionOntology } from '../../packages/db/src'
import { LibraryAggregateService } from '../../apps/api/src/services/libraryAggregateService'
import { VideoAggregateService } from '../../apps/api/src/services/videoAggregateService'

async function createUser(db: Awaited<ReturnType<typeof createMigratedTestDb>>['db'], id: string) {
  const now = new Date().toISOString()
  await db.insertInto('users').values({ id, email: null, display_name: id, created_at: now, updated_at: now, deleted_at: null }).execute()
}

test('knowledge graph explorer groups direct and nearby connections and resolves detail links', async () => {
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

  expect(result.groups.some((group) => group.label.startsWith('Through '))).toBe(true)
  expect(result.groups.flatMap((group) => group.items).some((item) => item.node.nodeType === 'skill' && item.node.id !== skill.node_id)).toBe(true)

  const videoResult = await library.getNodeConnections(userId, video.node.id)
  expect(videoResult.centerHref).toBe(`/videos/${video.video.id}`)
  expect(videoResult.groups.some((group) => group.label === 'Explains' && group.items.some((item) => item.node.id === skill.node_id))).toBe(true)

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
  expect(resources.drills.some((drill) => drill.title === 'Backhand Chop Depth Control')).toBe(true)

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
