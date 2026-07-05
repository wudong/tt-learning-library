import { z } from 'zod'
export const ShareTargetPayloadSchema = z.object({ title: z.string().max(500).optional(), text: z.string().max(4000).optional(), url: z.string().max(2048).optional() })
export type ShareTargetPayload = z.infer<typeof ShareTargetPayloadSchema>
