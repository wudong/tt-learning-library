import { z } from 'zod'
import { INBOX_STATUSES, SOURCE_PLATFORMS } from '../constants/statuses'
import { dataEnvelope, httpUrl, idSchema, isoDateString, listEnvelope, PageQuerySchema } from './common'

const rawPayload = z.record(z.string(), z.unknown()).optional()
export const InboxItemDtoSchema = z.object({
  id: idSchema,
  sourceUrl: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  sharedTitle: z.string().nullable(),
  sharedText: z.string().nullable(),
  sourcePlatform: z.enum(SOURCE_PLATFORMS),
  thumbnailUrl: z.string().url().nullable(),
  creatorName: z.string().nullable(),
  status: z.enum(INBOX_STATUSES),
  convertedNodeId: z.string().nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString
})
export type InboxItemDto = z.infer<typeof InboxItemDtoSchema>

export const CreateInboxRequestSchema = z.object({
  sourceUrl: httpUrl.optional(), sharedTitle: z.string().trim().max(500).optional(), sharedText: z.string().trim().max(4000).optional(),
  sourcePlatform: z.enum(SOURCE_PLATFORMS).optional(), rawPayload
}).refine((v) => Boolean(v.sourceUrl || v.sharedTitle || v.sharedText), { message: 'At least one capture field is required' })
export type CreateInboxRequest = z.infer<typeof CreateInboxRequestSchema>

export const UpdateInboxRequestSchema = z.object({
  sourceUrl: httpUrl.optional(), sharedTitle: z.string().max(500).nullable().optional(), sharedText: z.string().max(4000).nullable().optional(),
  status: z.enum(INBOX_STATUSES).optional()
})
export const ConvertInboxRequestSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  topicIds: z.array(idSchema).default([]), skillIds: z.array(idSchema).default([]), tagIds: z.array(idSchema).default([]),
  quickNote: z.string().trim().max(4000).optional(),
  progress: z.enum(['saved','watching','watched']).default('saved'),
  learningState: z.enum(['none','practicing','revisit','understood']).default('none')
})
export type ConvertInboxRequest = z.infer<typeof ConvertInboxRequestSchema>

export const InboxItemResponseSchema = dataEnvelope(InboxItemDtoSchema)
export const InboxListResponseSchema = listEnvelope(InboxItemDtoSchema)
export const InboxQuerySchema = PageQuerySchema.extend({ status: z.enum(INBOX_STATUSES).optional() })
