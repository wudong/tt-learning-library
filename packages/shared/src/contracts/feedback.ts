import { z } from 'zod'

export const FeedbackTypeEnum = z.enum(['bug', 'feature', 'general', 'data_accuracy'])
export type FeedbackType = z.infer<typeof FeedbackTypeEnum>

export const CreateFeedbackRequestSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().email().or(z.literal('')).optional().nullable(),
  message_type: FeedbackTypeEnum,
  message: z.string().min(3),
  page_path: z.string().max(500).optional().nullable(),
  page_title: z.string().max(200).optional().nullable(),
})

export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequestSchema>
