import { ApiErrorResponseSchema } from '@ttll/shared'
import type { z } from 'zod'
import { getAccessToken } from '../auth/supabase'
export class ApiClientError extends Error { constructor(public status: number, public code: string, message: string) { super(message) } }
export async function apiRequest<T>(input: RequestInfo | URL, init: RequestInit | undefined, schema: z.ZodType<T>): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)
  const res = await fetch(input, { credentials: 'include', ...init, headers })
  const payload: unknown = await res.json().catch(() => ({}))
  if (!res.ok) { const parsed = ApiErrorResponseSchema.safeParse(payload); throw new ApiClientError(res.status, parsed.success ? parsed.data.error.code : 'INTERNAL_ERROR', parsed.success ? parsed.data.error.message : 'Request failed') }
  return schema.parse(payload)
}

export async function authenticatedBlob(input: RequestInfo | URL): Promise<Blob> {
  const token = await getAccessToken()
  const res = await fetch(input, { credentials: 'include', headers: token ? { authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new ApiClientError(res.status, 'REQUEST_FAILED', 'Could not load picture')
  return res.blob()
}
