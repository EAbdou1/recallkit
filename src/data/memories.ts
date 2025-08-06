"use server";

import { getCurrentNamespace } from "@/actions/namespace";
import { auth } from "@clerk/nextjs/server";
import { client } from "@/lib/redis";

export interface Memory {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoriesResponse {
  memories: Memory[];
  userIds: string[];
}

export async function getMemoriesByNamespace(): Promise<MemoriesResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const currentNamespace = await getCurrentNamespace();
    if (!currentNamespace) {
      throw new Error("No namespace found");
    }

    // Get all memory keys for the namespace
    const keys = await client.keys(`memories:${currentNamespace}:*:ids`);
    console.log(
      `Found ${keys.length} memory keys for namespace ${currentNamespace}:`,
      keys
    );

    // Extract user IDs from the keys
    const userIds = keys.map((key) => {
      const parts = key.split(":");
      return parts[2]; // Get the userId part from memories:namespace:userId:ids
    });

    console.log(`Extracted user IDs:`, userIds);

    // Get memories for all users in the namespace
    const allMemories: Memory[] = [];

    for (const userId of userIds) {
      const userMemories = await getUserMemories(currentNamespace, userId);
      allMemories.push(...userMemories);
    }

    return {
      memories: allMemories,
      userIds: userIds,
    };
  } catch (error) {
    console.error("Failed to fetch memories by namespace:", error);
    throw new Error("Failed to fetch memories");
  }
}

export async function getUserMemories(
  namespace: string,
  userId: string
): Promise<Memory[]> {
  try {
    const memoryKey = `memories:${namespace}:${userId}`;

    // Get all memory IDs for this user
    const memoryIds = await client.sMembers(`${memoryKey}:ids`);

    console.log(`Found ${memoryIds.length} memory IDs for user ${userId}`);

    const memories: Memory[] = [];
    for (const memoryId of memoryIds) {
      try {
        const memoryData = (await client.json.get(`${memoryKey}:${memoryId}`, {
          path: "$",
        })) as Array<{
          id: string;
          text: string;
          embedding?: number[];
          namespace: string;
          userId: string;
          createdAt: string;
          updatedAt: string;
        }>;

        console.log(`Memory ${memoryId} data:`, memoryData);

        if (memoryData && memoryData[0]) {
          // Extract only the fields we need for the frontend
          const memory: Memory = {
            id: memoryData[0].id,
            text: memoryData[0].text,
            createdAt: memoryData[0].createdAt,
            updatedAt: memoryData[0].updatedAt,
          };
          memories.push(memory);
        }
      } catch (error) {
        console.error(`Failed to retrieve memory ${memoryId}:`, error);
      }
    }

    console.log(`Returning ${memories.length} memories for user ${userId}`);
    return memories;
  } catch (error) {
    console.error("Failed to fetch user memories:", error);
    throw new Error("Failed to fetch user memories");
  }
}

export async function getMemoriesByUser(
  namespace: string,
  userId: string
): Promise<Memory[]> {
  try {
    return await getUserMemories(namespace, userId);
  } catch (error) {
    console.error("Failed to fetch memories for user:", error);
    throw new Error("Failed to fetch memories for user");
  }
}

export async function getUsersForNamespace(
  namespace: string
): Promise<string[]> {
  try {
    const keys = await client.keys(`memories:${namespace}:*:ids`);
    const userIds = keys.map((key) => {
      const parts = key.split(":");
      return parts[2];
    });
    return userIds;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}
