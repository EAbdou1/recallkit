import { z } from "zod";

/**
 * Schema for validating extracted facts from conversations
 */
export const FactsSchema = z.object({
  facts: z.array(z.string()),
});

/**
 * Schema for validating memory update operations
 */
export const MemoryUpdateSchema = z.object({
  memory: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      event: z.enum(["ADD", "UPDATE", "DELETE", "NONE"]),
      old_memory: z.string().optional(),
    })
  ),
});

export type FactsResult = z.infer<typeof FactsSchema>;
export type MemoryUpdateResult = z.infer<typeof MemoryUpdateSchema>;
