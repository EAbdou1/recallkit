import { inngest } from "../inngest";
import type { ProcessMemoryEvent, ProcessMemoryResult } from "../../types";
import { extractFactsFromConversation } from "./fact-extraction";
import { reconcileMemoriesWithFacts } from "./memory-reconciliation";
import { persistMemoryOperations } from "./memory-storage";
import {
  processPersistenceResults,
  createProcessingResult,
  createNoFactsResult,
} from "./result-processor";

// Inngest step interface
interface InngestStep {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * Validates input parameters for memory processing
 */
function validateInputParameters(
  messages: any[],
  namespace: string,
  userId: string
): void {
  if (!messages?.length || !namespace || !userId) {
    throw new Error(
      "Invalid input parameters: messages, namespace, and userId are required"
    );
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
    validateInputParameters(messages, namespace, userId);

    // 🔹 STEP 1: Extract facts from the conversation using AI
    const extractedFacts = await step.run("1-extract-facts", async () => {
      return await extractFactsFromConversation(messages, namespace, userId);
    });

    // Early exit if no facts were extracted
    if (extractedFacts.facts.length === 0) {
      console.log(
        `[${namespace}/${userId}] No new facts found in conversation`
      );
      return createNoFactsResult();
    }

    // 🔹 STEP 2: Retrieve existing memories and reconcile them with new facts
    const memoryUpdateDecision = await step.run(
      "2-reconcile-memories",
      async () => {
        return await reconcileMemoriesWithFacts(
          extractedFacts,
          namespace,
          userId
        );
      }
    );

    // 🔹 STEP 3: Persist the final memory state back to Redis
    const persistenceResults = await step.run("3-persist-changes", async () => {
      console.log(
        `[${namespace}/${userId}] Persisting ${memoryUpdateDecision.memory.length} memory changes...`
      );

      const results = await persistMemoryOperations(
        namespace,
        userId,
        memoryUpdateDecision.memory
      );

      return processPersistenceResults(results, namespace, userId);
    });

    // Return comprehensive result
    return createProcessingResult(
      extractedFacts.facts.length,
      persistenceResults.summary.successful,
      persistenceResults.summary.operations,
      {
        extractedFacts: extractedFacts.facts,
        memoryOperations: memoryUpdateDecision.memory.length,
        persistenceResults: persistenceResults.summary,
      }
    );
  }
);
