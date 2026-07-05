import { z } from 'zod'

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR','NOT_FOUND','UNAUTHORIZED','FORBIDDEN','CONFLICT','UNSUPPORTED_SOURCE','RATE_LIMITED','EXPIRED','INTERNAL_ERROR'
])
export const ApiErrorResponseSchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string(), details: z.unknown().optional() })
})
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
})
export const PageSchema = z.object({ limit: z.number().int(), offset: z.number().int(), total: z.number().int() })
export const isoDateString = z.string().datetime()
export const httpUrl = z.string().trim().url().refine((v) => ['http:', 'https:'].includes(new URL(v).protocol), 'Must be HTTP/HTTPS')
export const idSchema = z.string().min(3).max(128)
export function dataEnvelope<T extends z.ZodTypeAny>(schema: T) { return z.object({ data: schema }) }
export function listEnvelope<T extends z.ZodTypeAny>(schema: T) { return z.object({ data: z.array(schema), page: PageSchema }) }
