import { z } from 'zod';
export declare const SearchQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    q: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<{
        video: "video";
        skill: "skill";
        topic: "topic";
        note: "note";
        drill: "drill";
        tag: "tag";
    }>>;
}, z.core.$strip>;
export declare const SearchResultDtoSchema: z.ZodObject<{
    id: z.ZodString;
    nodeId: z.ZodString;
    type: z.ZodString;
    title: z.ZodString;
    summary: z.ZodNullable<z.ZodString>;
    href: z.ZodString;
    context: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const SearchResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nodeId: z.ZodString;
        type: z.ZodString;
        title: z.ZodString;
        summary: z.ZodNullable<z.ZodString>;
        href: z.ZodString;
        context: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    page: z.ZodObject<{
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
