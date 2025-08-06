// vector-search.ts - IMPROVED VERSION
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { client } from "../redis";

interface RetrieveMemoriesParams {
  namespace: string;
  userId: string;
  query: string;
  topK?: number;
}

interface MemoryDocument {
  id: string;
  text: string;
  embedding: number[];
  namespace: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface RedisSearchDocument {
  id: string;
  value: {
    text: string;
    distance?: number;
  };
}

interface RedisSearchResult {
  total: number;
  documents: RedisSearchDocument[];
}

/**
 * Calculates cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Creates the Redis Search index for memories if it doesn't exist.
 * This function is idempotent.
 */
async function ensureRecallIndex(): Promise<void> {
  try {
    // Check if index exists first
    try {
      await client.ft.info("recall-index");
      console.log("[Vector Search] Index 'recall-index' already exists.");
      return;
    } catch (e: any) {
      if (!e.message.includes("Unknown index name")) {
        throw e;
      }
      // Index doesn't exist, create it
    }

    // Create the index with proper schema
    await client.ft.create(
      "recall-index",
      {
        "$.namespace": {
          type: "TAG",
          AS: "namespace",
        },
        "$.userId": {
          type: "TAG",
          AS: "userId",
        },
        "$.text": {
          type: "TEXT",
          AS: "text",
        },
        "$.embedding": {
          type: "VECTOR",
          ALGORITHM: "HNSW",
          TYPE: "FLOAT32",
          DIM: 1536,
          DISTANCE_METRIC: "COSINE",
          AS: "embedding",
        },
      },
      {
        ON: "JSON",
        PREFIX: "memories:",
      }
    );
    console.log(
      "[Vector Search] Successfully created Redis Search index 'recall-index'."
    );
  } catch (e: any) {
    console.error("[Vector Search] Failed to create Redis Search index:", e);
    throw e;
  }
}

/**
 * Recreates the Redis Search index (useful if index was created incorrectly)
 */
export async function recreateRecallIndex(): Promise<void> {
  try {
    // Try to drop the existing index
    try {
      await client.ft.dropIndex("recall-index");
      console.log("[Vector Search] Dropped existing 'recall-index'.");
    } catch (e: any) {
      if (!e.message.includes("Unknown index name")) {
        console.warn("[Vector Search] Could not drop index:", e.message);
      }
    }

    // Wait a moment for the drop to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create the index with proper schema
    await client.ft.create(
      "recall-index",
      {
        "$.namespace": {
          type: "TAG",
          AS: "namespace",
        },
        "$.userId": {
          type: "TAG",
          AS: "userId",
        },
        "$.text": {
          type: "TEXT",
          AS: "text",
        },
        "$.embedding": {
          type: "VECTOR",
          ALGORITHM: "HNSW",
          TYPE: "FLOAT32",
          DIM: 1536,
          DISTANCE_METRIC: "COSINE",
          AS: "embedding",
        },
      },
      {
        ON: "JSON",
        PREFIX: "memories:",
      }
    );
    console.log(
      "[Vector Search] Successfully recreated Redis Search index 'recall-index'."
    );
  } catch (e: any) {
    console.error("[Vector Search] Failed to recreate Redis Search index:", e);
    throw e;
  }
}

/**
 * Retrieves relevant memories using manual similarity calculation as fallback
 */
async function retrieveMemoriesWithFallback(
  namespace: string,
  userId: string,
  queryEmbedding: number[],
  topK: number
): Promise<string[]> {
  const memoryKey = `memories:${namespace}:${userId}`;

  // Get all memory IDs for this user
  const memoryIds = await client.sMembers(`${memoryKey}:ids`);

  if (memoryIds.length === 0) {
    console.log(`[Vector Search] No memories found for ${namespace}/${userId}`);
    return [];
  }

  console.log(
    `[Vector Search] Found ${memoryIds.length} memories, calculating similarities...`
  );

  // Fetch all memories and calculate similarities
  const memoriesWithScores: { text: string; similarity: number }[] = [];

  for (const memoryId of memoryIds) {
    try {
      const memoryData = (await client.json.get(`${memoryKey}:${memoryId}`, {
        path: "$",
      })) as unknown as MemoryDocument[];

      if (
        memoryData &&
        memoryData[0] &&
        memoryData[0].text &&
        memoryData[0].embedding
      ) {
        const memory = memoryData[0];
        const similarity = cosineSimilarity(queryEmbedding, memory.embedding);

        memoriesWithScores.push({
          text: memory.text,
          similarity: similarity,
        });
      }
    } catch (error) {
      console.error(
        `[Vector Search] Error processing memory ${memoryId}:`,
        error
      );
    }
  }

  // Sort by similarity (highest first) and take top K
  memoriesWithScores.sort((a, b) => b.similarity - a.similarity);

  const topMemories = memoriesWithScores.slice(0, topK);

  console.log(
    `[Vector Search] Top ${topMemories.length} memories with similarities:`,
    topMemories.map((m) => ({
      text: m.text.substring(0, 50) + "...",
      similarity: m.similarity.toFixed(4),
    }))
  );

  return topMemories.map((m) => m.text);
}

/**
 * Retrieves relevant memories from Redis using vector search.
 */
export async function retrieveMemories({
  namespace,
  userId,
  query,
  topK = 3,
}: RetrieveMemoriesParams): Promise<string[]> {
  if (!query || query.trim() === "") {
    console.log(
      "[Vector Search] Empty query provided, returning empty results"
    );
    return [];
  }

  try {
    console.log(
      `[Vector Search] Starting search for: "${query}" in namespace: ${namespace}, userId: ${userId}`
    );

    // Generate embedding for the query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    console.log(
      `[Vector Search] Generated embedding with ${embedding.length} dimensions`
    );

    // Try Redis vector search first
    try {
      await ensureRecallIndex();

      // Build the search query
      const searchQuery = `(@namespace:{${namespace}} @userId:{${userId}})=>[KNN ${topK} @embedding $query_vec AS distance]`;

      console.log(
        `[Vector Search] Executing Redis vector search: ${searchQuery}`
      );

      // Convert embedding to Buffer
      const queryVector = Buffer.from(new Float32Array(embedding).buffer);

      // Execute the search
      const searchResult = await client.ft.search("recall-index", searchQuery, {
        PARAMS: {
          query_vec: queryVector,
        },
        RETURN: ["text", "distance"],
        SORTBY: "distance",
        DIALECT: 2,
        LIMIT: {
          from: 0,
          size: topK,
        },
      });

      console.log(`[Vector Search] Redis search result:`, {
        total: (searchResult as RedisSearchResult)?.total,
        documents: (searchResult as RedisSearchResult)?.documents?.length || 0,
      });

      // Check if we got results
      if (
        (searchResult as RedisSearchResult)?.documents &&
        (searchResult as RedisSearchResult).documents.length > 0
      ) {
        // Extract memories from search results
        const memories: string[] = [];

        for (const doc of (searchResult as RedisSearchResult).documents) {
          try {
            if (
              doc.value &&
              typeof doc.value === "object" &&
              "text" in doc.value
            ) {
              const text = doc.value.text;
              if (text && typeof text === "string" && text.trim() !== "") {
                memories.push(text.trim());
              }
            }
          } catch (error) {
            console.error(
              `[Vector Search] Error processing document:`,
              doc,
              error
            );
          }
        }

        if (memories.length > 0) {
          console.log(
            `[Vector Search] Successfully retrieved ${memories.length} memories via Redis vector search`
          );
          return memories;
        }
      } else {
        console.log(
          `[Vector Search] Redis vector search returned no results, falling back to manual calculation`
        );
      }
    } catch (redisError) {
      console.error(`[Vector Search] Redis vector search failed:`, redisError);
    }

    // Fallback to manual similarity calculation
    console.log(`[Vector Search] Using fallback similarity calculation`);
    return await retrieveMemoriesWithFallback(
      namespace,
      userId,
      embedding,
      topK
    );
  } catch (error) {
    console.error(`[Vector Search] Error in retrieveMemories:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      namespace,
      userId,
      query: query.substring(0, 100) + "...",
    });
    return [];
  }
}

/**
 * Helper function to check if memories exist for debugging
 */
export async function debugMemoryCount(
  namespace: string,
  userId: string
): Promise<number> {
  try {
    const memoryKey = `memories:${namespace}:${userId}`;
    const count = await client.sCard(`${memoryKey}:ids`);
    console.log(`[Debug] Memory count for ${namespace}/${userId}: ${count}`);
    return count;
  } catch (error) {
    console.error(`[Debug] Error counting memories:`, error);
    return 0;
  }
}

/**
 * Helper function to list all memory IDs for debugging
 */
export async function debugListMemoryIds(
  namespace: string,
  userId: string
): Promise<string[]> {
  try {
    const memoryKey = `memories:${namespace}:${userId}`;
    const ids = await client.sMembers(`${memoryKey}:ids`);
    console.log(`[Debug] Memory IDs for ${namespace}/${userId}:`, ids);
    return ids;
  } catch (error) {
    console.error(`[Debug] Error listing memory IDs:`, error);
    return [];
  }
}
