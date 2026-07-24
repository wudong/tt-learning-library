import { z } from 'zod'
import { dataEnvelope, idSchema } from './common'
import { GraphNodeDtoSchema } from './graph'
import { VideoDtoSchema, VideoResponseSchema } from './video'

export const TopicDtoSchema = z.object({
  id: idSchema, nodeId: idSchema, name: z.string(), description: z.string().nullable(),
  parentTopicId: idSchema.nullable(), sortOrder: z.number().int(), isSystem: z.boolean(), isHidden: z.boolean(), isPinned: z.boolean()
})
export type TopicDto = z.infer<typeof TopicDtoSchema>

export const SkillDtoSchema = z.object({
  id: idSchema, nodeId: idSchema, topicId: idSchema.nullable(), name: z.string(),
  description: z.string().nullable(), difficulty: z.string().nullable(), status: z.string(),
  isSystem: z.boolean(), isPinned: z.boolean()
})
export type SkillDto = z.infer<typeof SkillDtoSchema>
export const DrillDtoSchema = z.object({
  id: idSchema, nodeId: idSchema, title: z.string(), description: z.string().nullable(),
  diagramUrl: z.string().nullable(),
  instructions: z.string().nullable(), difficulty: z.string().nullable(),
  durationMinutes: z.number().int().nullable(), repetitionTarget: z.number().int().nullable(),
  status: z.string(), isSystem: z.boolean(), isPinned: z.boolean()
})
export const DrillStepDtoSchema = z.object({
  id: idSchema, position: z.number().int().nonnegative(), actor: z.string(),
  stroke: z.string(), spin: z.enum(['topspin','backspin','sidespin','no_spin','variable']),
  fromZone: z.string(), targetZone: z.string(), instruction: z.string().nullable()
})

export const LibraryOverviewResponseSchema = dataEnvelope(z.object({
  topics: z.array(TopicDtoSchema),
  skills: z.array(SkillDtoSchema),
  drills: z.array(DrillDtoSchema),
  topicVideoCounts: z.record(idSchema, z.number().int().nonnegative()),
  skillVideoCounts: z.record(idSchema, z.number().int().nonnegative())
}))
export const LibraryNodeResourcesResponseSchema = dataEnvelope(z.object({
  node: GraphNodeDtoSchema,
  videos: z.array(VideoDtoSchema),
  skills: z.array(GraphNodeDtoSchema),
  drills: z.array(DrillDtoSchema),
  drill: DrillDtoSchema.nullable(),
  drillSteps: z.array(DrillStepDtoSchema),
  isPinned: z.boolean()
}))

export const CreateSkillRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  topicId: idSchema.optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  status: z.enum(['not_started', 'learning', 'practicing', 'improving', 'comfortable']).optional()
})
export const SkillResponseSchema = dataEnvelope(SkillDtoSchema)

export const CreateNoteRequestSchema = z.object({
  parentNodeId: idSchema,
  body: z.string().trim().min(1).max(10000),
  noteType: z.enum(['plain', 'question', 'takeaway', 'reminder']).default('plain')
})
export const NoteDtoSchema = z.object({
  id: idSchema, nodeId: idSchema, parentNodeId: idSchema, body: z.string(),
  noteType: z.string(), timestampSeconds: z.number().int().nullable()
})
export const NoteResponseSchema = dataEnvelope(NoteDtoSchema)

export const VideoSkillLinkSchema = z.object({
  skillId: idSchema,
  relationship: z.enum(['explains', 'demonstrates'])
})
export const UpdateVideoLearningContextRequestSchema = z.object({
  topicIds: z.array(idSchema).max(50),
  skills: z.array(VideoSkillLinkSchema).max(100)
})
export type UpdateVideoLearningContextRequest = z.infer<typeof UpdateVideoLearningContextRequestSchema>
export const UpdateVideoLearningContextResponseSchema = VideoResponseSchema

export const VideoLearningContextSchema = z.object({
  topics: z.array(GraphNodeDtoSchema),
  skills: z.array(z.object({
    node: GraphNodeDtoSchema,
    relationship: z.enum(['explains', 'demonstrates'])
  }))
})
