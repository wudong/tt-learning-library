import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateVideoRequestSchema, UpdateVideoLearningContextRequestSchema, UpdateVideoRequestSchema, VideoListQuerySchema } from '@ttll/shared'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { VideoRepository } from '@ttll/db'
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
    const detail = await new VideoAggregateService(db).getVideoDetail(userId, c.req.param('id'))
    if (!detail) return c.json({ error: { code: 'NOT_FOUND', message: 'Video not found' } }, 404)
    return c.json({ data: { video: presentVideo(detail.video), node: presentNode(detail.node), topics: detail.topics.map(presentNode), skills: detail.skills.map(presentNode), skillRelationships: detail.skillRelationships, tags: detail.tags.map(presentNode), notes: detail.notes.map(presentNode), drills: detail.drills.map(presentNode), related: detail.related.map(presentNode), learningPaths: detail.learningPaths.map(presentNode) } })
  })
  app.put('/:id/learning-context', zValidator('json', UpdateVideoLearningContextRequestSchema), async (c) => {
    const detail = await new VideoAggregateService(db).updateLearningContext(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json'))
    if (!detail) throw new Error('NOT_FOUND: Video not found')
    return c.json({ data: { video: presentVideo(detail.video), node: presentNode(detail.node), topics: detail.topics.map(presentNode), skills: detail.skills.map(presentNode), skillRelationships: detail.skillRelationships, tags: detail.tags.map(presentNode), notes: detail.notes.map(presentNode), drills: detail.drills.map(presentNode), related: detail.related.map(presentNode), learningPaths: detail.learningPaths.map(presentNode) } })
  })
  app.patch('/:id', zValidator('json', UpdateVideoRequestSchema), async (c) => {
    const input = c.req.valid('json')
    const row = await new VideoRepository(db).patch(getPrincipal(c).userId, c.req.param('id'), { title: input.title, description: input.description, progress: input.progress, learning_state: input.learningState, importance: input.importance })
    return c.json({ data: presentVideo(row) })
  })
  app.delete('/:id', async (c) => {
    const result = await new VideoAggregateService(db).deleteVideo(getPrincipal(c).userId, c.req.param('id'))
    return c.json({ data: result })
  })
  return app
}
