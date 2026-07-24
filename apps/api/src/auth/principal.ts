import type { Context, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'

export interface Principal { userId: string; email: string | null; mode: 'local'|'hosted' }
export interface VerifiedIdentity { id: string; email: string | null; displayName: string | null }
export interface IdentityVerifier { verify(token: string): Promise<VerifiedIdentity | null> }

const DEV_USER_ID = process.env.DEV_USER_ID ?? 'user_local'
export const AUTH_COOKIE = '__Host-ttll-session'

export function getPrincipal(c: Context): Principal { return c.get('principal') }

export function bearerToken(c: Context): string | null {
  const authorization = c.req.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice(7).trim()
  return token || null
}

export class SupabaseIdentityVerifier implements IdentityVerifier {
  constructor(
    private readonly url = process.env.SUPABASE_URL,
    private readonly publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async verify(token: string): Promise<VerifiedIdentity | null> {
    if (!this.url || !this.publishableKey || token.length > 8192) return null
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const response = await this.fetcher(`${this.url.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { apikey: this.publishableKey, authorization: `Bearer ${token}` },
        redirect: 'error',
        signal: controller.signal,
      })
      if (!response.ok) return null
      const value: unknown = await response.json()
      if (!value || typeof value !== 'object') return null
      const user = value as Record<string, unknown>
      if (typeof user.id !== 'string' || !user.id) return null
      const metadata = user.user_metadata && typeof user.user_metadata === 'object'
        ? user.user_metadata as Record<string, unknown>
        : {}
      const name = metadata.full_name ?? metadata.name ?? metadata.display_name
      return {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : null,
        displayName: typeof name === 'string' ? name : null,
      }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}

async function provisionUser(db: Kysely<Database>, identity: VerifiedIdentity) {
  const now = new Date().toISOString()
  await db.insertInto('users').values({
    id: identity.id,
    email: identity.email,
    display_name: identity.displayName,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }).onConflict((oc) => oc.column('id').doUpdateSet({
    email: identity.email,
    display_name: identity.displayName,
    updated_at: now,
    deleted_at: null,
  })).execute()

  const ownerEmail = process.env.LEGACY_OWNER_EMAIL?.trim().toLowerCase()
  const legacyId = process.env.LEGACY_OWNER_USER_ID ?? 'user_local'
  if (!ownerEmail || identity.email?.toLowerCase() !== ownerEmail || identity.id === legacyId) return
  await db.transaction().execute(async (trx) => {
    const legacy = await trx.selectFrom('users').select('id').where('id', '=', legacyId).forUpdate().executeTakeFirst()
    if (!legacy) return
    const ownedTables = [
      'graph_edges', 'videos', 'topics', 'skills', 'notes', 'drills', 'mistakes', 'tags',
      'learning_path_items', 'learning_paths', 'collection_items', 'collections', 'inbox_items', 'share_links', 'graph_nodes',
      'practice_skill_checkins', 'practice_session_blocks', 'practice_sessions',
      'pictures', 'drill_steps',
    ] as const
    for (const table of ownedTables) {
      await trx.updateTable(table).set({ user_id: identity.id }).where('user_id', '=', legacyId).execute()
    }
    await trx.deleteFrom('users').where('id', '=', legacyId).execute()
  })
}

export async function resolvePrincipal(
  c: Context,
  db: Kysely<Database>,
  verifier: IdentityVerifier = new SupabaseIdentityVerifier(),
): Promise<Principal | null> {
  if (process.env.HOSTED_AUTH_REQUIRED !== 'true') {
    return { userId: DEV_USER_ID, email: null, mode: 'local' }
  }
  const token = bearerToken(c) ?? getCookie(c, AUTH_COOKIE)
  if (!token) return null
  const identity = await verifier.verify(token)
  if (!identity) return null
  await provisionUser(db, identity)
  return { userId: identity.id, email: identity.email, mode: 'hosted' }
}

export function principalMiddleware(
  db: Kysely<Database>,
  verifier: IdentityVerifier = new SupabaseIdentityVerifier(),
): MiddlewareHandler {
  return async (c, next) => {
    const principal = await resolvePrincipal(c, db, verifier)
    if (!principal) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
    c.set('principal', principal)
    await next()
  }
}
