import { Hono } from 'hono'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { ShareTargetPayloadSchema } from '@ttll/shared'
import { getPrincipal } from '../auth/principal'
import { InboxCaptureService } from '../services/inboxCaptureService'
export function shareTargetRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.post('/', async (c) => {
    const form = await c.req.formData()
    const payload = ShareTargetPayloadSchema.parse({ title: form.get('title')?.toString(), text: form.get('text')?.toString(), url: form.get('url')?.toString() })
    const row = await new InboxCaptureService(db).capture(getPrincipal(c).userId, payload)
    return c.redirect(`/quick-save/${row.id}`, 303)
  })
  app.get('/', async (c) => {
    const payload = ShareTargetPayloadSchema.parse({ title: c.req.query('title'), text: c.req.query('text'), url: c.req.query('url') })
    const row = await new InboxCaptureService(db).capture(getPrincipal(c).userId, payload)
    return c.redirect(`/quick-save/${row.id}`, 303)
  })
  return app
}
