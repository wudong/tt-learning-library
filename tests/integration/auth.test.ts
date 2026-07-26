import { describe, expect, test } from 'bun:test'
import type { SupabaseIdentity } from '../../apps/api/src/auth/supabaseVerifier'
import { createMigratedTestDb } from '../../packages/db/src'
import { getPrincipal, principalMiddleware } from '../../apps/api/src/auth/principal'
import { signPendingShare, verifyPendingShare } from '../../apps/api/src/auth/pendingShare'
import { Hono } from 'hono'

describe('hosted authentication', () => {
  test('rejects unauthenticated requests and ignores spoofed user headers', async () => {
    const ctx = await createMigratedTestDb()
    try {
      const verifier = { verify: async () => null }
      const app = new Hono()
      app.use('*', principalMiddleware(ctx.db, verifier))
      app.get('/', (c) => c.json(getPrincipal(c)))
      const response = await app.request('/', { headers: { 'x-user-id': 'spoofed' } })
      expect(response.status).toBe(401)
    } finally { await ctx.db.destroy() }
  })

  test('provisions and derives the owner exclusively from a verified identity', async () => {
    const ctx = await createMigratedTestDb()
    try {
      const identity: SupabaseIdentity = { sub: 'supabase-user-1', email: 'player@example.test', displayName: 'Player One' }
      const verifier = { verify: async (header: string | undefined) => header === 'Bearer valid-token' ? identity : null }
      const app = new Hono()
      app.use('*', principalMiddleware(ctx.db, verifier))
      app.get('/', (c) => c.json(getPrincipal(c)))
      const response = await app.request('/', { headers: { authorization: 'Bearer valid-token', 'x-user-id': 'spoofed' } })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ userId: identity.sub, email: identity.email, displayName: identity.displayName })
      const user = await ctx.db.selectFrom('users').selectAll().where('id', '=', identity.sub).executeTakeFirstOrThrow()
      expect(user.email).toBe(identity.email)
      expect(user.display_name).toBe(identity.displayName)
    } finally { await ctx.db.destroy() }
  })

  test('claims legacy local data only for the configured owner email', async () => {
    const originalOwner = process.env.LEGACY_OWNER_EMAIL
    process.env.LEGACY_OWNER_EMAIL = 'owner@example.test'
    const ctx = await createMigratedTestDb()
    try {
      const now = new Date().toISOString()
      await ctx.db.insertInto('users').values({ id: 'user_local', email: null, display_name: 'Local', created_at: now, updated_at: now, deleted_at: null }).execute()
      const inbox = { id: 'inbox_legacy', user_id: 'user_local', source_url: null, canonical_url: null, shared_title: 'Legacy', shared_text: null, source_platform: 'manual', thumbnail_url: null, creator_name: null, raw_payload_json: null, status: 'new', converted_node_id: null, created_at: now, updated_at: now, deleted_at: null }
      await ctx.db.insertInto('inbox_items').values(inbox).execute()
      const identity: SupabaseIdentity = { sub: 'supabase-user-1', email: 'owner@example.test', displayName: 'Owner' }
      const verifier = { verify: async () => identity }
      const app = new Hono()
      app.use('*', principalMiddleware(ctx.db, verifier))
      app.get('/', (c) => c.json(getPrincipal(c)))
      expect((await app.request('/', { headers: { authorization: 'Bearer valid-token' } })).status).toBe(200)
      expect((await ctx.db.selectFrom('inbox_items').select('user_id').where('id', '=', inbox.id).executeTakeFirstOrThrow()).user_id).toBe('supabase-user-1')
      expect(await ctx.db.selectFrom('users').select('id').where('id', '=', 'user_local').executeTakeFirst()).toBeUndefined()
    } finally {
      if (originalOwner === undefined) delete process.env.LEGACY_OWNER_EMAIL
      else process.env.LEGACY_OWNER_EMAIL = originalOwner
      await ctx.db.destroy()
    }
  })

  test('signs bounded pending-share context and rejects tampering', async () => {
    const payload = { title: 'Serve tutorial', text: 'Useful', url: 'https://youtu.be/abc12345' }
    const token = await signPendingShare(payload)
    expect(await verifyPendingShare(token)).toEqual(payload)
    const [encodedPayload, signature] = token.split('.')
    const replacement = encodedPayload?.startsWith('A') ? 'B' : 'A'
    const tampered = `${replacement}${encodedPayload?.slice(1)}.${signature}`
    expect(await verifyPendingShare(tampered)).toBeNull()
  })
})
