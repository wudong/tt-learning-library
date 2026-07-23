import { z } from 'zod'
import { dataEnvelope, idSchema } from './common'

export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year!, month! - 1, day!))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month! - 1 && parsed.getUTCDate() === day
}, 'Invalid calendar date')
export const timeZoneSchema = z.string().trim().min(1).max(100)
export const trainingSessionStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'cancelled'])
export const trainingEntryModeSchema = z.enum(['planned', 'quick', 'manual'])
export const trainingBlockStatusSchema = z.enum(['planned', 'active', 'paused', 'completed', 'skipped'])
export const confidenceRatingSchema = z.number().int().min(1).max(5)

export const TrainingReferenceDtoSchema = z.object({
  id: idSchema,
  nodeId: idSchema,
  title: z.string(),
  subtitle: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
})

export const TrainingBlockDtoSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  skillId: idSchema,
  skill: TrainingReferenceDtoSchema,
  drillId: idSchema.nullable(),
  drill: TrainingReferenceDtoSchema.nullable(),
  videoId: idSchema.nullable(),
  video: TrainingReferenceDtoSchema.nullable(),
  position: z.number().int().nonnegative(),
  originalPosition: z.number().int().nonnegative().nullable(),
  plannedDurationSeconds: z.number().int().positive().nullable(),
  originalPlannedDurationSeconds: z.number().int().positive().nullable(),
  actualDurationSeconds: z.number().int().nonnegative(),
  timerStartedAt: z.string().nullable(),
  status: trainingBlockStatusSchema,
  focusNote: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
})

export const TrainingCheckinDtoSchema = z.object({
  skillId: idSchema,
  confidenceRating: confidenceRatingSchema.nullable(),
  note: z.string().nullable(),
})

export const TrainingSessionDtoSchema = z.object({
  id: idSchema,
  nodeId: idSchema,
  scheduledDate: localDateSchema,
  timeZone: timeZoneSchema,
  title: z.string(),
  status: trainingSessionStatusSchema,
  entryMode: trainingEntryModeSchema,
  overallRating: z.number().int().min(1).max(5).nullable(),
  reflection: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  actualDurationSeconds: z.number().int().nonnegative(),
  plannedDurationSeconds: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const TrainingSessionSummaryDtoSchema = TrainingSessionDtoSchema.extend({
  skillNames: z.array(z.string()),
  blockCount: z.number().int().nonnegative(),
})

export const TrainingSessionDetailDtoSchema = z.object({
  session: TrainingSessionDtoSchema,
  blocks: z.array(TrainingBlockDtoSchema),
  checkins: z.array(TrainingCheckinDtoSchema),
})

const trainingBlockInputSchema = z.object({
  id: idSchema.optional(),
  skillId: idSchema,
  drillId: idSchema.nullable().optional(),
  videoId: idSchema.nullable().optional(),
  plannedDurationSeconds: z.number().int().min(60).max(10800).nullable().optional(),
  actualDurationSeconds: z.number().int().min(0).max(43200).optional(),
  focusNote: z.string().trim().max(500).nullable().optional(),
})

export const CreateTrainingSessionRequestSchema = z.object({
  scheduledDate: localDateSchema,
  timeZone: timeZoneSchema,
  title: z.string().trim().min(1).max(200).optional(),
  entryMode: trainingEntryModeSchema,
  blocks: z.array(trainingBlockInputSchema).min(1).max(20),
  overallRating: z.number().int().min(1).max(5).nullable().optional(),
  reflection: z.string().trim().max(5000).nullable().optional(),
  checkins: z.array(z.object({
    skillId: idSchema,
    confidenceRating: confidenceRatingSchema.nullable().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })).max(20).optional(),
}).superRefine((value, ctx) => {
  value.blocks.forEach((block, index) => {
    if (value.entryMode === 'manual' && block.actualDurationSeconds === undefined) {
      ctx.addIssue({ code: 'custom', path: ['blocks', index, 'actualDurationSeconds'], message: 'Actual time is required for a manual log' })
    }
    if (value.entryMode !== 'manual' && !block.plannedDurationSeconds) {
      ctx.addIssue({ code: 'custom', path: ['blocks', index, 'plannedDurationSeconds'], message: 'Planned time is required' })
    }
  })
})

export const UpdateTrainingSessionRequestSchema = z.object({
  scheduledDate: localDateSchema.optional(),
  timeZone: timeZoneSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
})

export const ReplaceRemainingBlocksRequestSchema = z.object({
  blocks: z.array(trainingBlockInputSchema.extend({
    plannedDurationSeconds: z.number().int().min(60).max(10800),
  })).min(1).max(20),
})

export const CopyTrainingSessionRequestSchema = z.object({
  scheduledDate: localDateSchema,
  timeZone: timeZoneSchema,
  title: z.string().trim().min(1).max(200).optional(),
})

export const TrainingBlockTransitionRequestSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'complete', 'skip', 'add_time']),
  additionalSeconds: z.number().int().min(60).max(3600).optional(),
}).superRefine((value, ctx) => {
  if (value.action === 'add_time' && !value.additionalSeconds) {
    ctx.addIssue({ code: 'custom', path: ['additionalSeconds'], message: 'Additional time is required' })
  }
})

export const CompleteTrainingSessionRequestSchema = z.object({
  overallRating: z.number().int().min(1).max(5).nullable().optional(),
  reflection: z.string().trim().max(5000).nullable().optional(),
  checkins: z.array(z.object({
    skillId: idSchema,
    confidenceRating: confidenceRatingSchema.nullable().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
  })).max(20).default([]),
})

export const TrainingRangeQuerySchema = z.object({
  from: localDateSchema,
  to: localDateSchema,
})

export const TrainingSessionResponseSchema = dataEnvelope(TrainingSessionDetailDtoSchema)
export const TrainingSessionListResponseSchema = dataEnvelope(z.array(TrainingSessionSummaryDtoSchema))
export const DeleteTrainingSessionResponseSchema = dataEnvelope(z.object({ deleted: z.literal(true) }))

export const TrainingPracticeOptionsResponseSchema = dataEnvelope(z.object({
  skill: TrainingReferenceDtoSchema,
  drills: z.array(TrainingReferenceDtoSchema),
  videos: z.array(TrainingReferenceDtoSchema),
}))

export const TrainingInsightsResponseSchema = dataEnvelope(z.object({
  from: localDateSchema,
  to: localDateSchema,
  trainingDays: z.number().int().nonnegative(),
  actualDurationSeconds: z.number().int().nonnegative(),
  plannedDurationSeconds: z.number().int().nonnegative(),
  completedPlannedSessions: z.number().int().nonnegative(),
  plannedSessions: z.number().int().nonnegative(),
  skills: z.array(z.object({
    skillId: idSchema,
    skillName: z.string(),
    actualDurationSeconds: z.number().int().nonnegative(),
    plannedDurationSeconds: z.number().int().nonnegative(),
    latestConfidenceRating: confidenceRatingSchema.nullable(),
    previousConfidenceRating: confidenceRatingSchema.nullable(),
  })),
}))

export type CreateTrainingSessionRequest = z.infer<typeof CreateTrainingSessionRequestSchema>
export type ReplaceRemainingBlocksRequest = z.infer<typeof ReplaceRemainingBlocksRequestSchema>
export type CompleteTrainingSessionRequest = z.infer<typeof CompleteTrainingSessionRequestSchema>
export type TrainingSessionDetailDto = z.infer<typeof TrainingSessionDetailDtoSchema>
