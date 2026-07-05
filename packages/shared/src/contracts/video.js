import { z } from 'zod';
import { SOURCE_PLATFORMS, VIDEO_LEARNING_STATES, VIDEO_PROGRESS } from '../constants/statuses';
import { dataEnvelope, httpUrl, idSchema, isoDateString, listEnvelope, PageQuerySchema } from './common';
import { GraphNodeDtoSchema, GraphEdgeDtoSchema } from './graph';
export const VideoDtoSchema = z.object({
    id: idSchema, nodeId: idSchema, sourceUrl: z.string(), canonicalUrl: z.string().nullable(),
    sourcePlatform: z.enum(SOURCE_PLATFORMS), externalId: z.string().nullable(), title: z.string().nullable(),
    description: z.string().nullable(), thumbnailUrl: z.string().nullable(), creatorName: z.string().nullable(), durationSeconds: z.number().int().nullable(),
    progress: z.enum(VIDEO_PROGRESS), learningState: z.enum(VIDEO_LEARNING_STATES), importance: z.number().int().nullable(),
    createdAt: isoDateString, updatedAt: isoDateString
});
export const CreateVideoRequestSchema = z.object({
    sourceUrl: httpUrl, title: z.string().trim().max(500).optional(), topicIds: z.array(idSchema).default([]),
    skillIds: z.array(idSchema).default([]), tagIds: z.array(idSchema).default([]),
    progress: z.enum(VIDEO_PROGRESS).default('saved'), learningState: z.enum(VIDEO_LEARNING_STATES).default('none')
});
export const UpdateVideoRequestSchema = z.object({
    title: z.string().trim().max(500).optional(), description: z.string().max(4000).nullable().optional(),
    progress: z.enum(VIDEO_PROGRESS).optional(), learningState: z.enum(VIDEO_LEARNING_STATES).optional(), importance: z.number().int().min(1).max(5).nullable().optional()
});
export const VideoListQuerySchema = PageQuerySchema.extend({ q: z.string().optional(), topicId: idSchema.optional(), skillId: idSchema.optional(), tagId: idSchema.optional(), progress: z.enum(VIDEO_PROGRESS).optional(), learningState: z.enum(VIDEO_LEARNING_STATES).optional(), sourcePlatform: z.enum(SOURCE_PLATFORMS).optional() });
export const VideoDetailDtoSchema = z.object({ video: VideoDtoSchema, node: GraphNodeDtoSchema, topics: z.array(GraphNodeDtoSchema), skills: z.array(GraphNodeDtoSchema), tags: z.array(GraphNodeDtoSchema), notes: z.array(GraphNodeDtoSchema), drills: z.array(GraphNodeDtoSchema), related: z.array(GraphNodeDtoSchema), learningPaths: z.array(GraphNodeDtoSchema) });
export const ConvertInboxResponseSchema = dataEnvelope(z.object({ video: VideoDtoSchema, node: GraphNodeDtoSchema, createdEdges: z.array(GraphEdgeDtoSchema), createdNote: GraphNodeDtoSchema.nullable(), alreadyConverted: z.boolean(), alreadyExisting: z.boolean().optional() }));
export const VideoResponseSchema = dataEnvelope(VideoDetailDtoSchema);
export const VideoListResponseSchema = listEnvelope(VideoDtoSchema);
//# sourceMappingURL=video.js.map