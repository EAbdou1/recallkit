/**
 * RecallKit Memory Management System
 *
 * This module provides intelligent memory management capabilities for storing,
 * retrieving, and managing user memories from conversations.
 */

// Main memory processing function
export { processMemory } from "./memory-processor";

// Core services
export { extractFactsFromConversation } from "./fact-extraction";
export { reconcileMemoriesWithFacts } from "./memory-reconciliation";
export { persistMemoryOperations } from "./memory-storage";

// Utility functions
export { createTextEmbedding } from "./embedding-service";
export { fetchUserMemories, createMemoryKey } from "./redis-utils";

// Schemas and types
export { FactsSchema, MemoryUpdateSchema } from "./schemas";
export type { FactsResult, MemoryUpdateResult } from "./schemas";

// Result processing utilities
export {
  processPersistenceResults,
  createProcessingResult,
  createNoFactsResult,
} from "./result-processor";
