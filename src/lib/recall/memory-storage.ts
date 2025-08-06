import { client } from "../redis";
import { createTextEmbedding } from "./embedding-service";
import { createMemoryKey } from "./redis-utils";
import type { MemoryOperationResult, MemoryUpdateItem } from "../../types";

/**
 * Persists memory changes to Redis based on the update decision
 */
export async function persistMemoryOperations(
  namespace: string,
  userId: string,
  memoryUpdates: MemoryUpdateItem[]
): Promise<MemoryOperationResult[]> {
  const results: MemoryOperationResult[] = [];
  if (memoryUpdates.length === 0) {
    return results;
  }

  try {
    const memoryKey = createMemoryKey(namespace, userId);
    const pipeline = client.multi();

    for (const update of memoryUpdates) {
      const { id, text, event } = update;

      try {
        switch (event) {
          case "ADD": {
            const embedding = await createTextEmbedding(text);
            const now = new Date().toISOString();
            const memoryDocument = {
              id,
              text,
              embedding,
              namespace,
              userId,
              createdAt: now,
              updatedAt: now,
            };

            pipeline.json.set(`${memoryKey}:${id}`, "$", memoryDocument);
            pipeline.sAdd(`${memoryKey}:ids`, id);

            results.push({
              success: true,
              operation: "ADD",
              memoryId: id,
            });
            break;
          }

          case "UPDATE": {
            const exists = await client.sIsMember(`${memoryKey}:ids`, id);
            if (!exists) {
              results.push({
                success: false,
                operation: "UPDATE",
                memoryId: id,
                error: "Memory not found for update",
              });
              continue;
            }

            const embedding = await createTextEmbedding(text);
            const updatedDocument = {
              id,
              text,
              embedding,
              namespace,
              userId,
              updatedAt: new Date().toISOString(),
            };

            pipeline.json.set(`${memoryKey}:${id}`, "$", updatedDocument);

            results.push({
              success: true,
              operation: "UPDATE",
              memoryId: id,
            });
            break;
          }

          case "DELETE": {
            pipeline.sRem(`${memoryKey}:ids`, id);
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
    // Propagate a more specific error if the pipeline failed
    if (error instanceof Error && error.message.includes("pipeline.json.set")) {
      throw new Error(
        "A command in the Redis pipeline failed. Check Redis client compatibility with JSON module."
      );
    }
    throw new Error("Failed to persist memory changes to Redis");
  }
}
