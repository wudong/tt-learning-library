import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createMigratedTestDb } from '../../packages/db/src/testing/testDb'
import { getPrincipal, principalMiddleware, type IdentityVerifier } from '../../apps/api/src/auth/principal'
import { signPendingShare, verifyPendingShare } from '../../apps/api/src/auth/pendingShare'
import { InboxRepository } from '../../packages/db/src'

const verifier: IdentityVerifier = {
  async verify(token) {
    return token === 'valid-token'
      ? { id: 'supabase-user-1', email: 'player@example.com', displayName: 'Player' }
      : null
  },
}

const previousHosted = process.env.HOSTED_AUTH_REQUIRED
const previousSecret = process.env.AUTH_COOKIE_SECRET
const previousLegacyOwner = process.env.LEGACY_OWNER_EMAIL

beforeEach(() => {
  process.env.HOSTED_AUTH_REQUIRED = 'true'
  process.env.AUTH_COOKIE_SECRET = 'test-secret-that-is-at-least-thirty-two-characters'
  delete process.env.LEGACY_OWNER_EMAIL
})

afterEach(() => {
  if (previousHosted === undefined) delete process.env.HOSTED_AUTH_REQUIRED
  else process.env.HOSTED_AUTH_REQUIRED = previousHosted
  if (previousSecret === undefined) delete process.env.AUTH_COOKIE_SECRET
  else process.env.AUTH_COOKIE_SECRET = previousSecret
  if (previousLegacyOwner === undefined) delete process.env.LEGACY_OWNER_EMAIL
  else process.env.LEGACY_OWNER_EMAIL = previousLegacyOwner
})

describe('hosted authentication', () => {
  test('rejects unauthenticated requests and ignores spoofed user headers', async () => {
    const ctx = await createMigratedTestDb()
    try {
      const app = new Hono()
      app.use('*', principalMiddleware(ctx.db, verifier))
      app.get('/', (c) => c.json({ userId: getPrincipal(c).userId }))
      expect((await app.request('/', { headers: { 'x-user-id': 'attacker' } })).status).toBe(401)
      expect((await app.request('/', { headers: { authorization: 'Bearer invalid' } })).status).toBe(401)
    } finally { await ctx.db.destroy() }
  })

  test('provisions and derives the owner exclusively from a verified identity', async () => {
    const ctx = await createMigratedTestDb()
    try {
      const app = new Hono()
      app.use('*', principalMiddleware(ctx.db, verifier))
      app.get('/', (c) => c.json(getPrincipal(c)))
      const response = await app.request('/', { headers: { authorization: 'Bearer valid-token', 'x-user-id': 'attacker' } })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ userId: 'supabase-user-1', email: 'player@example.com', mode: 'hosted' })
      const user = await ctx.db.selectFrom('users').selectAll().where('id', '=', 'supabase-user-1').executeTakeFirstOrThrow()
      expect(user.email).toBe('player@example.com')
      expect(user.display_name).toBe('Player')
    } finally { await ctx.db.destroy() }
  })

  test('claims legacy local data only for the configured owner email', async () => {
    process.env.LEGACY_OWNER_EMAIL = 'player@example.com'
    const ctx = await createMigratedTestDb()
    try {
      const now = new Date().toISOString()
      await ctx.db.insertInto('users').values({ id: 'user_local', email: null, display_name: 'Legacy', created_at: now, updated_at: now, deleted_at: null }).execute()
      const inbox = await new InboxRepository(ctx.db).create({ userId: 'user_local', sourceUrl: 'https://youtu.be/abc12345', sourcePlatform: 'youtube' })
      const app = new Hono()
      app.use('*', principalMiddleware(ctx.db, verifier))
      app.get('/', (c) => c.json(getPrincipal(c)))
      expect((await app.request('/', { headers: { authorization: 'Bearer valid-token' } })).status).toBe(200)
      expect((await ctx.db.selectFrom('inbox_items').select('user_id').where('id', '=', inbox.id).executeTakeFirstOrThrow()).user_id).toBe('supabase-user-1')
      expect(await ctx.db.selectFrom('users').select('id').where('id', '=', 'user_local').executeTakeFirst()).toBeUndefined()
    } finally { await ctx.db.destroy() }
  })

  test('signs bounded pending-share context and rejects tampering', async () => {
    const payload = { title: 'Serve tutorial', text: 'Useful', url: 'https://youtu.be/abc12345' }
    const token = await signPendingShare(payload)
    expect(await verifyPendingShare(token)).toEqual(payload)
    expect(await verifyPendingShare(`${token.slice(0, -1)}x`)).toBeNull()
  })
})
