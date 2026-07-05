import { z } from 'zod';
import { dataEnvelope, idSchema, isoDateString } from './common';
export const CreateShareLinkRequestSchema = z.object({ targetNodeId: idSchema, expiresAt: isoDateString.nullable().optional() });
export const ShareLinkDtoSchema = z.object({ id: idSchema, targetNodeId: idSchema, tokenPrefix: z.string(), shareUrl: z.string(), expiresAt: z.string().nullable(), revokedAt: z.string().nullable(), createdAt: isoDateString });
export const PublicShareDtoSchema = z.object({ nodeType: z.string(), title: z.string(), summary: z.string().nullable(), projection: z.record(z.string(), z.unknown()) });
export const ShareLinkResponseSchema = dataEnvelope(ShareLinkDtoSchema);
export const PublicShareResponseSchema = dataEnvelope(PublicShareDtoSchema);
//# sourceMappingURL=share.js.map