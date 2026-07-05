import { z } from 'zod';
export declare const ShareTargetPayloadSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ShareTargetPayload = z.infer<typeof ShareTargetPayloadSchema>;
