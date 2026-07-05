import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

const ERROR_MAP: Record<string, { status: number; code: string }> = {
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  CONFLICT: { status: 409, code: 'CONFLICT' },
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
  EXPIRED: { status: 410, code: 'EXPIRED' },
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
}

function classifyError(message: string): { status: number; code: string; safeMessage: string } {
  for (const [prefix, mapping] of Object.entries(ERROR_MAP)) {
    if (message.startsWith(prefix)) {
      return { ...mapping, safeMessage: message }
    }
  }
  if (message.includes('duplicate') || message.includes('CONFLICT')) {
    return { status: 409, code: 'CONFLICT', safeMessage: message }
  }
  return { status: 500, code: 'INTERNAL_ERROR', safeMessage: 'Internal error' }
}

export const errorMiddleware: MiddlewareHandler = async (c, next) => {
  try { await next() } catch (err) {
    if (err instanceof HTTPException) throw err
    const message = err instanceof Error ? err.message : 'Internal error'
    const { status, code, safeMessage } = classifyError(message)
    return c.json({ error: { code, message: safeMessage } }, status as any)
  }
}
