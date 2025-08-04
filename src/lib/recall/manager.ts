import { inngest } from "../inngest";
import { FACT_RETRIEVAL_PROMPT, getUpdateMemoryPrompt } from "./prompts";
import { generateText, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { getRedisClient } from "../redis";
import { z } from "zod";
import type {
  Message,
  ProcessMemoryEvent,
  MemoryOperationResult,
  SimpleMemory,
  ProcessMemoryResult,
  MemoryUpdateItem,
} from "../../types";
import { google } from "@ai-sdk/google";

// Redis pipeline result type for internal use
type RedisCommandResult = [Error | null, unknown] | null;

// Inngest step interface
interface InngestStep {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
}

// Zod schemas for runtime validation
const FactsSchema = z.object({
  facts: z.array(z.string()),
});

const MemoryUpdateSchema = z.object({
  memory: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      event: z.enum(["ADD", "UPDATE", "DELETE", "NONE"]),
      old_memory: z.string().optional(),
    })
  ),
});

/**
 * Generates Redis key for user memories
 */
function getMemoryKey(namespace: string, userId: string): string {
  return `memories:${namespace}:${userId}`;
}

/**
 * Generates embedding for text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });
    return embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw new Error("Failed to generate embedding for text");
  }
}

/**
 * Retrieves existing memories from Redis for a specific user and namespace
 */
async function getExistingMemories(
  namespace: string,
  userId: string
): Promise<SimpleMemory[]> {
  try {
    const redis = await getRedisClient();
    const memoryKey = getMemoryKey(namespace, userId);

    // Get all memory IDs for this user
    const memoryIds = await redis.sMembers(`${memoryKey}:ids`);

    if (memoryIds.length === 0) {
      console.log(`[${namespace}/${userId}] No existing memories found`);
      return [];
    }

    // Fetch all memories in parallel
    const memories: { id: string; text: string }[] = [];
    const pipeline = redis.multi();

    for (const memoryId of memoryIds) {
      pipeline.hGetAll(`${memoryKey}:${memoryId}`);
    }

    const results = await pipeline.exec();

    if (results) {
      for (let i = 0; i < results.length; i++) {
        const commandResult = results[i] as unknown as RedisCommandResult;
        if (commandResult && !commandResult[0] && commandResult[1]) {
          const memoryData = commandResult[1] as Record<string, string>;
          if (memoryData.text) {
            memories.push({
              id: memoryIds[i],
              text: memoryData.text,
            });
          }
        }
      }
    }

    console.log(
      `[${namespace}/${userId}] Retrieved ${memories.length} existing memories`
    );
    return memories;
  } catch (error) {
    console.error(
      `[${namespace}/${userId}] Failed to retrieve memories:`,
      error
    );
    throw new Error("Failed to retrieve existing memories from Redis");
  }
}

/**
 * Persists memory changes to Redis based on the update decision
 */
async function persistMemoryChanges(
  namespace: string,
  userId: string,
  memoryUpdates: MemoryUpdateItem[]
): Promise<MemoryOperationResult[]> {
  const results: MemoryOperationResult[] = [];

  try {
    const redis = await getRedisClient();
    const memoryKey = getMemoryKey(namespace, userId);
    const pipeline = redis.multi();

    for (const update of memoryUpdates) {
      const { id, text, event } = update;

      try {
        switch (event) {
          case "ADD": {
            // Generate embedding for new memory
            const embedding = await generateEmbedding(text);
            const now = new Date().toISOString();

            // Store memory data
            pipeline.hSet(`${memoryKey}:${id}`, {
              id,
              text,
              embedding: JSON.stringify(embedding),
              createdAt: now,
              updatedAt: now,
            });

            // Add to memory IDs set
            pipeline.sAdd(`${memoryKey}:ids`, id);

            results.push({
              success: true,
              operation: "ADD",
              memoryId: id,
            });
            break;
          }

          case "UPDATE": {
            // Check if memory exists
            const exists = await redis.sIsMember(`${memoryKey}:ids`, id);
            if (!exists) {
              results.push({
                success: false,
                operation: "UPDATE",
                memoryId: id,
                error: "Memory not found for update",
              });
              continue;
            }

            // Generate new embedding for updated text
            const embedding = await generateEmbedding(text);

            // Update memory data
            pipeline.hSet(`${memoryKey}:${id}`, {
              text,
              embedding: JSON.stringify(embedding),
              updatedAt: new Date().toISOString(),
            });

            results.push({
              success: true,
              operation: "UPDATE",
              memoryId: id,
            });
            break;
          }

          case "DELETE": {
            // Remove from memory IDs set
            pipeline.sRem(`${memoryKey}:ids`, id);

            // Delete memory data
            pipeline.del(`${memoryKey}:${id}`);

            results.push({
              success: true,
              operation: "DELETE",
              memoryId: id,
            });
            break;
          }

          case "NONE":
            results.push({
              success: true,
              operation: "NONE",
              memoryId: id,
            });
            break;
        }
      } catch (error) {
        console.error(
          `[${namespace}/${userId}] Error processing ${event} for memory ${id}:`,
          error
        );
        results.push({
          success: false,
          operation: event,
          memoryId: id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Execute all Redis operations
    await pipeline.exec();

    console.log(
      `[${namespace}/${userId}] Successfully persisted ${results.length} memory operations`
    );
    return results;
  } catch (error) {
    console.error(
      `[${namespace}/${userId}] Failed to persist memory changes:`,
      error
    );
    throw new Error("Failed to persist memory changes to Redis");
  }
}

/**
 * The main Inngest function for processing and managing memories.
 * This is triggered by an event from our /v1/recall endpoint.
 */
export const processMemory = inngest.createFunction(
  { id: "process-memory-job", retries: 2 },
  { event: "memory/process" },
  async ({ event, step }: { event: ProcessMemoryEvent; step: InngestStep }) => {
    const { messages, namespace, userId } = event.data;

    // Validate input parameters
    if (!messages?.length || !namespace || !userId) {
      throw new Error(
        "Invalid input parameters: messages, namespace, and userId are required"
      );
    }

    // Combine messages into a single string for the LLM (with proper typing)
    const conversationString = messages
      .map((m: Message) => `${m.role}: ${m.content}`)
      .join("\n");

    // 🔹 STEP 1: Extract facts from the conversation using the first prompt
    const extractedFacts = await step.run("1-extract-facts", async () => {
      console.log(
        `[${namespace}/${userId}] Step 1: Extracting facts from ${messages.length} messages...`
      );

      const fullPrompt = FACT_RETRIEVAL_PROMPT() + "\n\n" + conversationString;

      const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        prompt: fullPrompt,
        temperature: 0.1, // Low temperature for consistent fact extraction
      });

      try {
        const parsed = FactsSchema.parse(JSON.parse(text));
        console.log(
          `[${namespace}/${userId}] Successfully extracted ${parsed.facts.length} facts:`,
          parsed.facts
        );
        return parsed;
      } catch (error) {
        console.error(
          `[${namespace}/${userId}] Failed to parse facts JSON:`,
          error,
          "Raw text:",
          text
        );
        throw new Error("Failed to extract facts from conversation");
      }
    });

    // Early exit if no facts were extracted
    if (extractedFacts.facts.length === 0) {
      console.log(
        `[${namespace}/${userId}] No new facts found in conversation`
      );
      const result: ProcessMemoryResult = {
        status: "complete",
        reason: "No new facts found.",
        factsProcessed: 0,
        memoriesChanged: 0,
      };
      return result;
    }

    // 🔹 STEP 2: Retrieve existing memories and reconcile them
    const memoryUpdateDecision = await step.run(
      "2-reconcile-memories",
      async () => {
        console.log(`[${namespace}/${userId}] Step 2: Reconciling memories...`);

        // Retrieve existing memories from Redis
        const existingMemories = await getExistingMemories(namespace, userId);

        const existingMemoriesString = JSON.stringify(
          existingMemories,
          null,
          2
        );
        const newFactsString = JSON.stringify(extractedFacts.facts, null, 2);

        const updatePrompt = getUpdateMemoryPrompt(
          existingMemoriesString,
          newFactsString
        );

        const { text } = await generateText({
          model: openai("gpt-4o"),
          prompt: updatePrompt,
          temperature: 0.1, // Low temperature for consistent memory updates
        });

        try {
          const parsed = MemoryUpdateSchema.parse(JSON.parse(text));
          console.log(
            `[${namespace}/${userId}] Memory update decision with ${parsed.memory.length} operations:`,
            parsed.memory.map((m) => `${m.event}:${m.id}`)
          );
          return parsed;
        } catch (error) {
          console.error(
            `[${namespace}/${userId}] Failed to parse memory update JSON:`,
            error,
            "Raw text:",
            text
          );
          throw new Error("Failed to generate memory update decision");
        }
      }
    );

    // 🔹 STEP 3: Persist the final memory state back to Redis
    const persistenceResults = await step.run("3-persist-changes", async () => {
      console.log(
        `[${namespace}/${userId}] Step 3: Persisting ${memoryUpdateDecision.memory.length} memory changes...`
      );

      const results = await persistMemoryChanges(
        namespace,
        userId,
        memoryUpdateDecision.memory
      );

      // Log results summary
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;
      const operationCounts = results.reduce((acc, r) => {
        acc[r.operation] = (acc[r.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(
        `[${namespace}/${userId}] Persistence complete: ${successCount} succeeded, ${failureCount} failed`
      );
      console.log(
        `[${namespace}/${userId}] Operations: ${JSON.stringify(
          operationCounts
        )}`
      );

      if (failureCount > 0) {
        const failures = results.filter((r) => !r.success);
        console.error(`[${namespace}/${userId}] Failed operations:`, failures);
      }

      return {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          operations: operationCounts,
        },
      };
    });

    // Return comprehensive result
    const result: ProcessMemoryResult = {
      status: "complete",
      factsProcessed: extractedFacts.facts.length,
      memoriesChanged: persistenceResults.summary.successful,
      operationsSummary: persistenceResults.summary.operations,
      details: {
        extractedFacts: extractedFacts.facts,
        memoryOperations: memoryUpdateDecision.memory.length,
        persistenceResults: persistenceResults.summary,
      },
    };

    return result;
  }
);
