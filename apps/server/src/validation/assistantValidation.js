import { z } from "zod";

const assistantHistoryMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

const assistantContextSchema = z
  .object({
    page: z.string().trim().max(200).optional(),
    propertyId: z.string().trim().max(120).optional(),
    clientCity: z.string().trim().max(120).optional(),
    clientAddress: z.string().trim().max(255).optional(),
    location: z
      .object({
        city: z.string().trim().max(120).optional(),
        address: z.string().trim().max(255).optional(),
        latitude: z.number().finite().optional(),
        longitude: z.number().finite().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const assistantChatBodySchema = z
  .object({
    message: z.string().trim().min(1).max(1000),
    history: z.array(assistantHistoryMessageSchema).max(20).optional().default([]),
    context: assistantContextSchema.optional().default({}),
  })
  .strict();
