import { z } from 'zod';
export declare const CreateShareLinkRequestSchema: z.ZodObject<{
    targetNodeId: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ShareLinkDtoSchema: z.ZodObject<{
    id: z.ZodString;
    targetNodeId: z.ZodString;
    tokenPrefix: z.ZodString;
    shareUrl: z.ZodString;
    expiresAt: z.ZodNullable<z.ZodString>;
    revokedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export declare const PublicShareDtoSchema: z.ZodObject<{
    nodeType: z.ZodString;
    title: z.ZodString;
    summary: z.ZodNullable<z.ZodString>;
    projection: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export declare const ShareLinkResponseSchema: z.ZodObject<{
    data: z.ZodObject<{
        id: z.ZodString;
        targetNodeId: z.ZodString;
        tokenPrefix: z.ZodString;
        shareUrl: z.ZodString;
        expiresAt: z.ZodNullable<z.ZodString>;
        revokedAt: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const PublicShareResponseSchema: z.ZodObject<{
    data: z.ZodObject<{
        nodeType: z.ZodString;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        projection: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strip>;
