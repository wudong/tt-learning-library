import { z } from 'zod';
import { EDGE_TYPES, NODE_TYPES } from '../constants/index';
import { VISIBILITIES } from '../constants/statuses';
import { isoDateString, idSchema } from './common';
export const NodeTypeSchema = z.enum(NODE_TYPES);
export const EdgeTypeSchema = z.enum(EDGE_TYPES);
export const VisibilitySchema = z.enum(VISIBILITIES);
export const GraphNodeDtoSchema = z.object({
    id: idSchema, nodeType: NodeTypeSchema, title: z.string(), summary: z.string().nullable(), visibility: VisibilitySchema,
    createdAt: isoDateString, updatedAt: isoDateString
});
export const GraphEdgeDtoSchema = z.object({
    id: idSchema, sourceNodeId: idSchema, targetNodeId: idSchema, edgeType: EdgeTypeSchema,
    label: z.string().nullable(), weight: z.number().int().nullable(), position: z.number().int().nullable(),
    createdAt: isoDateString, updatedAt: isoDateString
});
//# sourceMappingURL=graph.js.map
