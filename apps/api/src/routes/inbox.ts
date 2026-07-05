import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateInboxRequestSchema, InboxQuerySchema, UpdateInboxRequestSchema, ConvertInboxRequestSchema } from '@ttll/shared'
import type { Database } from '@ttll/db'
import { InboxRepository } from '@ttll/db'
import type { Kysely } from 'kysely'
import { getPrincipal } from '../auth/principal'
import { InboxCaptureService } from '../services/inboxCaptureService'
import { VideoAggregateService } from '../services/videoAggregateService'
import { presentEdge, presentInbox, presentNode, presentVideo } from '../services/presenters'

export function inboxRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.post('/', zValidator('json', CreateInboxRequestSchema), async (c) => {
    const row = await new InboxCaptureService(db).capture(getPrincipal(c).userId, c.req.valid('json'))
    return c.json({ data: presentInbox(row) }, 201)
  })
  app.get('/', zValidator('query', InboxQuerySchema), async (c) => {
    const q = c.req.valid('query')
    const res = await new InboxRepository(db).list(getPrincipal(c).userId, q)
    return c.json({ data: res.data.map(presentInbox), page: { limit: q.limit, offset: q.offset, total: res.total } })
  })
  app.get('/:id', async (c) => {
    const row = await new InboxRepository(db).get(getPrincipal(c).userId, c.req.param('id'))
    if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Inbox item not found' } }, 404)
    return c.json({ data: presentInbox(row) })
  })
  app.patch('/:id', zValidator('json', UpdateInboxRequestSchema), async (c) => {
    const input = c.req.valid('json')
    const row = await new InboxRepository(db).patch(getPrincipal(c).userId, c.req.param('id'), { source_url: input.sourceUrl, shared_title: input.sharedTitle, shared_text: input.sharedText, status: input.status } as any)
    return c.json({ data: presentInbox(row) })
  })
  app.delete('/:id', async (c) => { await new InboxRepository(db).softDelete(getPrincipal(c).userId, c.req.param('id')); return c.json({ data: { deleted: true } }) })
  app.post('/:id/convert-to-video', zValidator('json', ConvertInboxRequestSchema), async (c) => {
    const res = await new VideoAggregateService(db).convertInboxItemToVideo(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json'))
    return c.json({ data: { video: presentVideo(res.video), node: presentNode(res.node), createdEdges: res.createdEdges.map(presentEdge), createdNote: res.createdNote ? presentNode(res.createdNote) : null, alreadyConverted: res.alreadyConverted, alreadyExisting: (res as any).alreadyExisting } })
  })
  return app
}
