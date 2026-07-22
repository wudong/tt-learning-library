import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { ShareTargetPayloadSchema } from '@ttll/shared'
import { getPrincipal, resolvePrincipal } from '../auth/principal'
import { PENDING_SHARE_COOKIE, signPendingShare } from '../auth/pendingShare'
import { InboxCaptureService } from '../services/inboxCaptureService'
export function shareTargetRoutes(db: Kysely<Database>) {
  const app = new Hono()
  async function captureOrAuthenticate(c: any, payload: ReturnType<typeof ShareTargetPayloadSchema.parse>) {
    const principal = await resolvePrincipal(c, db)
    if (!principal) {
      const pending = await signPendingShare(payload)
      setCookie(c, PENDING_SHARE_COOKIE, pending, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: 10 * 60,
      })
      return c.redirect('/login?shared=1', 303)
    }
    c.set('principal', principal)
    const row = await new InboxCaptureService(db).capture(getPrincipal(c).userId, payload)
    return c.redirect(`/quick-save/${row.id}`, 303)
  }
  app.post('/', async (c) => {
    const form = await c.req.formData()
    const payload = ShareTargetPayloadSchema.parse({ title: form.get('title')?.toString(), text: form.get('text')?.toString(), url: form.get('url')?.toString() })
    return captureOrAuthenticate(c, payload)
  })
  app.get('/', async (c) => {
    if (process.env.HOSTED_AUTH_REQUIRED === 'true') {
      return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use the installed app share target or manual capture' } }, 405)
    }
    const payload = ShareTargetPayloadSchema.parse({ title: c.req.query('title'), text: c.req.query('text'), url: c.req.query('url') })
    return captureOrAuthenticate(c, payload)
  })
  return app
}
