import { z } from 'zod';
export declare const InboxItemDtoSchema: z.ZodObject<{
    id: z.ZodString;
    sourceUrl: z.ZodNullable<z.ZodString>;
    canonicalUrl: z.ZodNullable<z.ZodString>;
    sharedTitle: z.ZodNullable<z.ZodString>;
    sharedText: z.ZodNullable<z.ZodString>;
    sourcePlatform: z.ZodEnum<{
        other: "other";
        youtube: "youtube";
        facebook: "facebook";
    }>;
    status: z.ZodEnum<{
        saved: "saved";
        new: "new";
        archived: "archived";
        organized: "organized";
    }>;
    convertedNodeId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type InboxItemDto = z.infer<typeof InboxItemDtoSchema>;
export declare const CreateInboxRequestSchema: z.ZodObject<{
    sourceUrl: z.ZodOptional<z.ZodString>;
    sharedTitle: z.ZodOptional<z.ZodString>;
    sharedText: z.ZodOptional<z.ZodString>;
    sourcePlatform: z.ZodOptional<z.ZodEnum<{
        other: "other";
        youtube: "youtube";
        facebook: "facebook";
    }>>;
    rawPayload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CreateInboxRequest = z.infer<typeof CreateInboxRequestSchema>;
export declare const UpdateInboxRequestSchema: z.ZodObject<{
    sourceUrl: z.ZodOptional<z.ZodString>;
    sharedTitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sharedText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        saved: "saved";
        new: "new";
        archived: "archived";
        organized: "organized";
    }>>;
}, z.core.$strip>;
export declare const ConvertInboxRequestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    topicIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    skillIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    tagIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    quickNote: z.ZodOptional<z.ZodString>;
    progress: z.ZodDefault<z.ZodEnum<{
        saved: "saved";
        watching: "watching";
        watched: "watched";
    }>>;
    learningState: z.ZodDefault<z.ZodEnum<{
        none: "none";
        practicing: "practicing";
        revisit: "revisit";
        understood: "understood";
    }>>;
}, z.core.$strip>;
export type ConvertInboxRequest = z.infer<typeof ConvertInboxRequestSchema>;
export declare const InboxItemResponseSchema: z.ZodObject<{
    data: z.ZodObject<{
        id: z.ZodString;
        sourceUrl: z.ZodNullable<z.ZodString>;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        sharedTitle: z.ZodNullable<z.ZodString>;
        sharedText: z.ZodNullable<z.ZodString>;
        sourcePlatform: z.ZodEnum<{
            other: "other";
            youtube: "youtube";
            facebook: "facebook";
        }>;
        status: z.ZodEnum<{
            saved: "saved";
            new: "new";
            archived: "archived";
            organized: "organized";
        }>;
        convertedNodeId: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const InboxListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceUrl: z.ZodNullable<z.ZodString>;
        canonicalUrl: z.ZodNullable<z.ZodString>;
        sharedTitle: z.ZodNullable<z.ZodString>;
        sharedText: z.ZodNullable<z.ZodString>;
        sourcePlatform: z.ZodEnum<{
            other: "other";
            youtube: "youtube";
            facebook: "facebook";
        }>;
        status: z.ZodEnum<{
            saved: "saved";
            new: "new";
            archived: "archived";
            organized: "organized";
        }>;
        convertedNodeId: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    page: z.ZodObject<{
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const InboxQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodOptional<z.ZodEnum<{
        saved: "saved";
        new: "new";
        archived: "archived";
        organized: "organized";
    }>>;
}, z.core.$strip>;
