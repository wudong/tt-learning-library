import type { Context, MiddlewareHandler } from 'hono'
export interface Principal { userId: string; mode: 'local'|'hosted' }
const DEV_USER_ID = process.env.DEV_USER_ID ?? 'user_local'
export function getPrincipal(c: Context): Principal { return c.get('principal') }
export const principalMiddleware: MiddlewareHandler = async (c, next) => {
  const hosted = process.env.HOSTED_AUTH_REQUIRED === 'true'
  if (hosted) {
    const userId = c.req.header('x-user-id')
    if (!userId) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
    c.set('principal', { userId, mode: 'hosted' } satisfies Principal)
  } else c.set('principal', { userId: DEV_USER_ID, mode: 'local' } satisfies Principal)
  await next()
}
