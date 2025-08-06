import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

/**
 * Generates embedding for text using OpenAI
 */
export async function createTextEmbedding(text: string): Promise<number[]> {
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
