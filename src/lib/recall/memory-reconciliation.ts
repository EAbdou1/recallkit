import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { getUpdateMemoryPrompt } from "./prompts";
import { MemoryUpdateSchema, type MemoryUpdateResult } from "./schemas";
import { fetchUserMemories } from "./redis-utils";
import type { FactsResult } from "./schemas";

/**
 * Reconciles new facts with existing memories using AI
 */
export async function reconcileMemoriesWithFacts(
  extractedFacts: FactsResult,
  namespace: string,
  userId: string
): Promise<MemoryUpdateResult> {
  console.log(`[${namespace}/${userId}] Reconciling memories...`);

  // Retrieve existing memories from Redis
  const existingMemories = await fetchUserMemories(namespace, userId);

  const existingMemoriesString = JSON.stringify(existingMemories, null, 2);
  const newFactsString = JSON.stringify(extractedFacts.facts, null, 2);

  const updatePrompt = getUpdateMemoryPrompt(
    existingMemoriesString,
    newFactsString
  );

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: MemoryUpdateSchema,
    prompt: updatePrompt,
    temperature: 0.1, // Low temperature for consistent memory updates
  });

  console.log(
    `[${namespace}/${userId}] Memory update decision with ${object.memory.length} operations:`,
    object.memory.map(
      (m) => `${m.event}:${m.id}:${m.text?.substring(0, 50)}...`
    )
  );

  // Additional debugging to see what operations we're performing
  const operationCounts = object.memory.reduce((acc, m) => {
    acc[m.event] = (acc[m.event] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`[${namespace}/${userId}] Operation breakdown:`, operationCounts);

  return object;
}
