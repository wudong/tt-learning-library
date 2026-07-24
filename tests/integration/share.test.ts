import { expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createMigratedTestDb, GraphRepository } from '../../packages/db/src'
import { publicShareRoutes, shareRoutes } from '../../apps/api/src/routes/share'

test('share creation returns the frontend URL and the projection is public', async () => {
  const { db } = await createMigratedTestDb()
  try {
    const userId = 'user_share_test'
    const now = new Date().toISOString()
    await db.insertInto('users').values({ id: userId, email: null, display_name: 'Share test', created_at: now, updated_at: now, deleted_at: null }).execute()
    const node = await new GraphRepository(db).createNode({ userId, nodeType: 'video', title: 'Backspin serve tutorial', summary: 'Contact underneath the ball.' })

    const app = new Hono()
    app.route('/api/public/share', publicShareRoutes(db))
    app.use('/api/share-links/*', async (c, next) => {
      c.set('principal', { userId, email: null, mode: 'local' })
      await next()
    })
    app.route('/api/share-links', shareRoutes(db, { publicAppOrigin: 'https://app.example.test' }))

    const createResponse = await app.request('https://api.example.test/api/share-links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetNodeId: node.id }),
    })
    expect(createResponse.status).toBe(201)
    const created = await createResponse.json() as { data: { shareUrl: string } }
    expect(created.data.shareUrl).toStartWith('https://app.example.test/s/')

    const token = created.data.shareUrl.split('/').at(-1)!
    const publicResponse = await app.request(`https://api.example.test/api/public/share/${token}`)
    expect(publicResponse.status).toBe(200)
    const projection = await publicResponse.json() as { data: Record<string, unknown> }
    expect(projection.data.title).toBe('Backspin serve tutorial')
    expect(JSON.stringify(projection)).not.toContain(userId)
    expect(JSON.stringify(projection)).not.toContain(node.id)
  } finally {
    await db.destroy()
  }
})
