import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { FACT_RETRIEVAL_PROMPT } from "./prompts";
import { FactsSchema, type FactsResult } from "./schemas";
import type { Message } from "../../types";

/**
 * Extracts facts from a conversation using AI
 */
export async function extractFactsFromConversation(
  messages: Message[],
  namespace: string,
  userId: string
): Promise<FactsResult> {
  console.log(
    `[${namespace}/${userId}] Extracting facts from ${messages.length} messages...`
  );

  // Combine messages into a single string for the LLM
  const conversationString = messages
    .map((m: Message) => `${m.role}: ${m.content}`)
    .join("\n");

  const fullPrompt = FACT_RETRIEVAL_PROMPT() + "\n\n" + conversationString;

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: FactsSchema,
    prompt: fullPrompt,
    temperature: 0.1, // Low temperature for consistent fact extraction
  });

  console.log(
    `[${namespace}/${userId}] Successfully extracted ${object.facts.length} facts:`,
    object.facts
  );

  return object;
}
