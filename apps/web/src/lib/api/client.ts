import { ApiErrorResponseSchema } from '@ttll/shared'
import type { z } from 'zod'
export class ApiClientError extends Error { constructor(public status: number, public code: string, message: string) { super(message) } }
export async function apiRequest<T>(input: RequestInfo | URL, init: RequestInit | undefined, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(input, { credentials: 'include', headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }, ...init })
  const payload: unknown = await res.json().catch(() => ({}))
  if (!res.ok) { const parsed = ApiErrorResponseSchema.safeParse(payload); throw new ApiClientError(res.status, parsed.success ? parsed.data.error.code : 'INTERNAL_ERROR', parsed.success ? parsed.data.error.message : 'Request failed') }
  return schema.parse(payload)
}
