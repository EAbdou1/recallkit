import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { getRedisClient } from "../redis";

interface RetrieveMemoriesParams {
  namespace: string;
  userId: string;
  query: string;
  topK?: number;
}

/**
 * Creates the Redis Search index for memories if it doesn't exist.
 * This function is idempotent.
 */
async function ensureRecallIndex(): Promise<void> {
  const redis = await getRedisClient();
  try {
    // Attempt to create the index.
    await redis.ft.create(
      "recall-index",
      {
        "$.namespace": { type: "TAG", AS: "namespace" },
        "$.userId": { type: "TAG", AS: "userId" },
        "$.text": { type: "TEXT", AS: "text" },
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
      "[DEBUG] Successfully created Redis Search index 'recall-index'."
    );
  } catch (e: any) {
    // If the index already exists, Redis will throw an error.
    // We can safely ignore this error.
    if (e.message.includes("Index already exists")) {
      console.log(
        "[DEBUG] Index 'recall-index' already exists. No action taken."
      );
    } else {
      // For any other error, we should log it and re-throw it.
      console.error("[DEBUG] Failed to create Redis Search index:", e);
      throw e;
    }
  }
}

/**
 * Retrieves relevant memories from Redis using vector search.
 */
export async function retrieveMemories({
  namespace,
  userId,
  query,
  topK = 5,
}: RetrieveMemoriesParams): Promise<string[]> {
  if (!query) {
    return [];
  }

  try {
    // This function will now reliably create the index if it's missing.
    await ensureRecallIndex();

    const redis = await getRedisClient();

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    const escapedNamespace = namespace.replace(
      /[,.<>{}[\]"':;!@#$%^&*()\-+=~|/\\ ]/g,
      "\\$&"
    );
    const escapedUserId = userId.replace(
      /[,.<>{}[\]"':;!@#$%^&*()\-+=~|/\\ ]/g,
      "\\$&"
    );
    const redisQuery = `(@namespace:{${escapedNamespace}} @userId:{${escapedUserId}})=>[KNN ${topK} @embedding $query_vec AS distance]`;

    console.log(`[Redis Query] Executing: ${redisQuery}`);

    const queryVector = Buffer.from(new Float32Array(embedding).buffer);
    const searchResult = await redis.ft.search("recall-index", redisQuery, {
      PARAMS: {
        query_vec: queryVector,
      },
      RETURN: ["text", "distance"],
      SORTBY: "distance",
      DIALECT: 2,
    });

    const memories = searchResult.documents.map(
      (doc) => doc.value.text as string
    );
    console.log(
      `[Result] Vector search found ${memories.length} relevant memories.`
    );
    return memories;
  } catch (error) {
    console.error(
      `[${namespace}/${userId}] Error in Redis vector search:`,
      error
    );
    return [];
  }
}
