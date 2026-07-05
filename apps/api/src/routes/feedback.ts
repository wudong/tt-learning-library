import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateFeedbackRequestSchema } from '@ttll/shared'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'

export function feedbackRoutes(db: Kysely<Database>) {
  const app = new Hono()

  app.post('/', zValidator('json', CreateFeedbackRequestSchema), async (c) => {
    const body = c.req.valid('json')
    const id = `fb_${crypto.randomUUID().slice(0, 8)}`

    const cleanEmail = body.email && body.email.trim() !== '' ? body.email.trim() : null
    const cleanName = body.name && body.name.trim() !== '' ? body.name.trim() : null

    await db
      .insertInto('feedback')
      .values({
        id,
        name: cleanName,
        email: cleanEmail,
        message_type: body.message_type,
        message: body.message.trim(),
        page_path: body.page_path?.trim() ?? null,
        page_title: body.page_title?.trim() ?? null,
        created_at: new Date().toISOString(),
      })
      .execute()

    return c.json({ success: true, id }, 201)
  })

  return app
}
