import { z } from 'zod'
import { idSchema, listEnvelope, PageQuerySchema } from './common'
export const SearchQuerySchema = PageQuerySchema.extend({ q: z.string().trim().min(2), type: z.enum(['video','skill','topic','note','drill','tag']).optional() })
export const SearchResultDtoSchema = z.object({ id: idSchema, nodeId: idSchema, type: z.string(), title: z.string(), summary: z.string().nullable(), href: z.string(), context: z.string().nullable() })
export const SearchResponseSchema = listEnvelope(SearchResultDtoSchema)
