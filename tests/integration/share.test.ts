import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createMigratedTestDb, GraphRepository } from '../../packages/db/src'
import { principalMiddleware } from '../../apps/api/src/auth/principal'
import { publicShareRoutes, shareRoutes } from '../../apps/api/src/routes/share'

const previousHosted = process.env.HOSTED_AUTH_REQUIRED
const previousPublicOrigin = process.env.PUBLIC_APP_ORIGIN

beforeEach(() => {
  process.env.HOSTED_AUTH_REQUIRED = 'false'
  process.env.PUBLIC_APP_ORIGIN = 'https://app.example.test'
})

afterEach(() => {
  if (previousHosted === undefined) delete process.env.HOSTED_AUTH_REQUIRED
  else process.env.HOSTED_AUTH_REQUIRED = previousHosted
  if (previousPublicOrigin === undefined) delete process.env.PUBLIC_APP_ORIGIN
  else process.env.PUBLIC_APP_ORIGIN = previousPublicOrigin
})

test('share creation returns the frontend URL and the projection is public', async () => {
  const { db } = await createMigratedTestDb()
  try {
    const now = new Date().toISOString()
    await db.insertInto('users').values({ id: 'user_local', email: null, display_name: 'Local', created_at: now, updated_at: now, deleted_at: null }).execute()
    const node = await new GraphRepository(db).createNode({ userId: 'user_local', nodeType: 'video', title: 'Backspin serve tutorial', summary: 'Contact underneath the ball.' })

    const app = new Hono()
    app.route('/api/public/share', publicShareRoutes(db))
    app.use('/api/*', principalMiddleware(db))
    app.route('/api/share-links', shareRoutes(db))

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
    expect(JSON.stringify(projection)).not.toContain('user_local')
    expect(JSON.stringify(projection)).not.toContain(node.id)
  } finally {
    await db.destroy()
  }
})
