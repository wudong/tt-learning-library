import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { AUTH_COOKIE, bearerToken, getPrincipal } from '../auth/principal'
import { PENDING_SHARE_COOKIE, verifyPendingShare } from '../auth/pendingShare'
import { InboxCaptureService } from '../services/inboxCaptureService'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax' as const,
  path: '/',
  maxAge: 60 * 60,
}

export function authRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.post('/session', async (c) => {
    const token = bearerToken(c)
    if (!token) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
    setCookie(c, AUTH_COOKIE, token, cookieOptions)
    let redirectTo: string | null = null
    const pending = getCookie(c, PENDING_SHARE_COOKIE)
    if (pending) {
      const payload = await verifyPendingShare(pending)
      deleteCookie(c, PENDING_SHARE_COOKIE, { path: '/', secure: cookieOptions.secure })
      if (payload) {
        const row = await new InboxCaptureService(db).capture(getPrincipal(c).userId, payload)
        redirectTo = `/quick-save/${row.id}`
      }
    }
    return c.json({ data: { userId: getPrincipal(c).userId, email: getPrincipal(c).email, redirectTo } })
  })
  app.get('/me', (c) => c.json({ data: getPrincipal(c) }))
  return app
}

export function publicAuthRoutes() {
  const app = new Hono()
  app.post('/logout', (c) => {
    deleteCookie(c, AUTH_COOKIE, { path: '/', secure: cookieOptions.secure })
    deleteCookie(c, PENDING_SHARE_COOKIE, { path: '/', secure: cookieOptions.secure })
    return c.json({ data: { signedOut: true } })
  })
  return app
}
