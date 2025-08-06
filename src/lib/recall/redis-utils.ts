import { client } from "../redis";
import type { SimpleMemory } from "../../types";

/**
 * Generates Redis key for user memories
 */
export function createMemoryKey(namespace: string, userId: string): string {
  return `memories:${namespace}:${userId}`;
}

/**
 * Retrieves existing memories from Redis for a specific user and namespace
 */
export async function fetchUserMemories(
  namespace: string,
  userId: string
): Promise<SimpleMemory[]> {
  try {
    const memoryKey = createMemoryKey(namespace, userId);

    // Get all memory IDs for this user
    const memoryIds = await client.sMembers(`${memoryKey}:ids`);

    if (memoryIds.length === 0) {
      console.log(`[${namespace}/${userId}] No existing memories found`);
      return [];
    }

    // Fetch all memories from JSON documents
    const memories: { id: string; text: string }[] = [];

    for (const memoryId of memoryIds) {
      try {
        const memoryData = (await client.json.get(`${memoryKey}:${memoryId}`, {
          path: "$",
        })) as Array<{ text: string }>;
        if (memoryData && memoryData[0] && memoryData[0].text) {
          memories.push({
            id: memoryId,
            text: memoryData[0].text,
          });
        }
      } catch (error) {
        console.error(
          `[${namespace}/${userId}] Failed to retrieve memory ${memoryId}:`,
          error
        );
      }
    }

    console.log(
      `[${namespace}/${userId}] Retrieved ${memories.length} existing memories:`,
      memories.map((m) => ({
        id: m.id,
        text: m.text.substring(0, 100) + "...",
      }))
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
