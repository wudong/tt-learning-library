import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateVideoRequestSchema, UpdateVideoRequestSchema, VideoListQuerySchema } from '@ttll/shared'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { GraphRepository, ShareRepository, VideoRepository } from '@ttll/db'
import { getPrincipal } from '../auth/principal'
import { VideoAggregateService } from '../services/videoAggregateService'
import { presentEdge, presentNode, presentVideo } from '../services/presenters'

export function videoRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.post('/', zValidator('json', CreateVideoRequestSchema), async (c) => {
    const res = await new VideoAggregateService(db).createVideo(getPrincipal(c).userId, c.req.valid('json'))
    return c.json({ data: { video: presentVideo(res.video), node: presentNode(res.node), createdEdges: res.createdEdges.map(presentEdge), createdNote: null, alreadyConverted: false, alreadyExisting: res.alreadyExisting } }, res.alreadyExisting ? 200 : 201)
  })
  app.get('/', zValidator('query', VideoListQuerySchema), async (c) => {
    const q = c.req.valid('query')
    const res = await new VideoRepository(db).list(getPrincipal(c).userId, q)
    return c.json({ data: res.data.map(presentVideo), page: { limit: q.limit, offset: q.offset, total: res.total } })
  })
  app.get('/:id', async (c) => {
    const userId = getPrincipal(c).userId
    const video = await new VideoRepository(db).getById(userId, c.req.param('id'))
    if (!video) return c.json({ error: { code: 'NOT_FOUND', message: 'Video not found' } }, 404)
    const graph = new GraphRepository(db)
    const node = await graph.getNode(userId, video.node_id)
    return c.json({ data: { video: presentVideo(video), node: presentNode(node!), topics: [], skills: [], tags: [], notes: [], drills: [], related: (await graph.related(userId, video.node_id)).map(presentNode), learningPaths: [] } })
  })
  app.patch('/:id', zValidator('json', UpdateVideoRequestSchema), async (c) => {
    const input = c.req.valid('json')
    const row = await new VideoRepository(db).patch(getPrincipal(c).userId, c.req.param('id'), { title: input.title, description: input.description, progress: input.progress, learning_state: input.learningState, importance: input.importance })
    return c.json({ data: presentVideo(row) })
  })
  app.delete('/:id', async (c) => {
    const userId = getPrincipal(c).userId
    const video = await new VideoRepository(db).softDelete(userId, c.req.param('id'))
    await new GraphRepository(db).softDeleteNode(userId, video.node_id)
    await new ShareRepository(db).revokeForNode(userId, video.node_id)
    return c.json({ data: { deleted: true } })
  })
  return app
}
