import { z } from 'zod';
export declare const ErrorCodeSchema: z.ZodEnum<{
    VALIDATION_ERROR: "VALIDATION_ERROR";
    NOT_FOUND: "NOT_FOUND";
    UNAUTHORIZED: "UNAUTHORIZED";
    FORBIDDEN: "FORBIDDEN";
    CONFLICT: "CONFLICT";
    UNSUPPORTED_SOURCE: "UNSUPPORTED_SOURCE";
    RATE_LIMITED: "RATE_LIMITED";
    EXPIRED: "EXPIRED";
    INTERNAL_ERROR: "INTERNAL_ERROR";
}>;
export declare const ApiErrorResponseSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodEnum<{
            VALIDATION_ERROR: "VALIDATION_ERROR";
            NOT_FOUND: "NOT_FOUND";
            UNAUTHORIZED: "UNAUTHORIZED";
            FORBIDDEN: "FORBIDDEN";
            CONFLICT: "CONFLICT";
            UNSUPPORTED_SOURCE: "UNSUPPORTED_SOURCE";
            RATE_LIMITED: "RATE_LIMITED";
            EXPIRED: "EXPIRED";
            INTERNAL_ERROR: "INTERNAL_ERROR";
        }>;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export declare const PageQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const PageSchema: z.ZodObject<{
    limit: z.ZodNumber;
    offset: z.ZodNumber;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const isoDateString: z.ZodString;
export declare const httpUrl: z.ZodString;
export declare const idSchema: z.ZodString;
export declare function dataEnvelope<T extends z.ZodTypeAny>(schema: T): z.ZodObject<{
    data: T;
}, z.core.$strip>;
export declare function listEnvelope<T extends z.ZodTypeAny>(schema: T): z.ZodObject<{
    data: z.ZodArray<T>;
    page: z.ZodObject<{
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
