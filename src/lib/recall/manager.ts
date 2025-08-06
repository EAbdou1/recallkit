// Re-export the main memory processor function for backward compatibility
export { processMemory } from "./memory-processor";

// Re-export utility functions that might be used elsewhere
export { createTextEmbedding } from "./embedding-service";
export { fetchUserMemories, createMemoryKey } from "./redis-utils";
export { persistMemoryOperations } from "./memory-storage";
export { extractFactsFromConversation } from "./fact-extraction";
export { reconcileMemoriesWithFacts } from "./memory-reconciliation";
export { FactsSchema, MemoryUpdateSchema } from "./schemas";
export type { FactsResult, MemoryUpdateResult } from "./schemas";
