import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateShareLinkRequestSchema } from '@ttll/shared'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { ShareRepository } from '@ttll/db'
import { getPrincipal } from '../auth/principal'
import { ShareService } from '../services/shareService'
export function shareRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.post('/', zValidator('json', CreateShareLinkRequestSchema), async (c) => { const body = c.req.valid('json'); const res = await new ShareService(db).createLink(getPrincipal(c).userId, body.targetNodeId, body.expiresAt); const origin = new URL(c.req.url).origin; return c.json({ data: { id: res.row.id, targetNodeId: res.row.target_node_id, tokenPrefix: res.row.token_prefix, shareUrl: `${origin}/s/${res.rawToken}`, expiresAt: res.row.expires_at, revokedAt: res.row.revoked_at, createdAt: res.row.created_at } }, 201) })
  app.delete('/:id', async (c) => { const row = await new ShareRepository(db).revoke(getPrincipal(c).userId, c.req.param('id')); if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Share link not found' } }, 404); return c.json({ data: { revoked: true } }) })
  return app
}
export function publicShareRoutes(db: Kysely<Database>) { const app = new Hono(); app.get('/:token', async (c) => c.json({ data: await new ShareService(db).getPublicProjection(c.req.param('token')) })); return app }
