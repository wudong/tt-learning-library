import { expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createMigratedTestDb, GraphRepository, VideoRepository } from '../../packages/db/src'
import { publicShareRoutes, shareRoutes } from '../../apps/api/src/routes/share'

test('share creation returns the frontend URL and an allowlisted public video projection', async () => {
  const { db } = await createMigratedTestDb()
  try {
    const userId = 'user_share_test'
    const now = new Date().toISOString()
    await db.insertInto('users').values({ id: userId, email: null, display_name: 'Share test', created_at: now, updated_at: now, deleted_at: null }).execute()
    const node = await new GraphRepository(db).createNode({ userId, nodeType: 'video', title: 'Backspin serve tutorial', summary: 'Contact underneath the ball.' })
    const video = await new VideoRepository(db).create({
      userId,
      nodeId: node.id,
      sourceUrl: 'https://www.facebook.com/coach/videos/123456789012345',
      canonicalUrl: 'https://www.facebook.com/watch/?v=123456789012345',
      sourcePlatform: 'facebook',
      externalId: '123456789012345',
      title: 'Backspin serve tutorial',
      thumbnailUrl: null,
      creatorName: 'TT Coach',
      progress: 'saved',
      learningState: 'none',
    })

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
    const response = await publicResponse.json() as {
      data: { title: string; projection: { video: { sourceUrl: string; canonicalUrl: string; sourcePlatform: string } } }
    }
    expect(response.data.title).toBe('Backspin serve tutorial')
    expect(response.data.projection.video).toMatchObject({
      sourceUrl: video.source_url,
      canonicalUrl: video.canonical_url,
      sourcePlatform: 'facebook',
    })
    expect(JSON.stringify(response)).not.toContain(userId)
    expect(JSON.stringify(response)).not.toContain(node.id)
    expect(JSON.stringify(response)).not.toContain(video.id)
  } finally {
    await db.destroy()
  }
})
