import { z } from 'zod'

export const AttachmentSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  parentNodeId: z.string(),
  fileName: z.string(),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  byteSize: z.number().int().positive().max(5 * 1024 * 1024),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const AttachmentResponseSchema = z.object({ data: AttachmentSchema })
export const AttachmentListResponseSchema = z.object({ data: z.array(AttachmentSchema) })
export type Attachment = z.infer<typeof AttachmentSchema>
