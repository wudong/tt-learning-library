import { z } from 'zod'

export const FeedbackTypeEnum = z.enum(['bug', 'feature', 'general', 'data_accuracy'])
export type FeedbackType = z.infer<typeof FeedbackTypeEnum>

/**
 * Feedback submitted from the UI. The API validates this, injects `app_id`
 * server-side, and proxies the request to the standalone feedback service
 * (see docs in scripts/workflow + INTEGRATION.md). `metadata` carries optional
 * client context (userAgent, screenSize, url, …); `website` is a honeypot.
 */
export const CreateFeedbackRequestSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().email().or(z.literal('')).optional().nullable(),
  message_type: FeedbackTypeEnum,
  message: z.string().min(3),
  page_path: z.string().max(500).optional().nullable(),
  page_title: z.string().max(200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  /** Honeypot — must be left empty by real users. */
  website: z.string().optional().nullable(),
})

export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequestSchema>