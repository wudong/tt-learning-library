import type { MiddlewareHandler } from 'hono'
export const requestIdMiddleware: MiddlewareHandler = async (c, next) => { const id = crypto.randomUUID(); c.header('x-request-id', id); c.set('requestId', id); await next() }
