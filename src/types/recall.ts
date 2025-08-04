/**
 * Type definitions for the RecallKit memory management system
 */

// Message structure for conversations
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// Event structure for processing memories via Inngest
export interface ProcessMemoryEvent {
  data: {
    messages: Message[];
    namespace: string;
    userId: string;
  };
}

// Result of memory operations (ADD, UPDATE, DELETE, NONE)
export interface MemoryOperationResult {
  success: boolean;
  operation: "ADD" | "UPDATE" | "DELETE" | "NONE";
  memoryId: string;
  error?: string;
}

// Memory item structure for storage and retrieval
export interface Memory {
  id: string;
  text: string;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

// Simplified memory structure for LLM processing
export interface SimpleMemory {
  id: string;
  text: string;
}

// Result of the complete memory processing workflow
export interface ProcessMemoryResult {
  status: "complete" | "error";
  factsProcessed: number;
  memoriesChanged: number;
  operationsSummary?: Record<string, number>;
  reason?: string;
  details?: {
    extractedFacts: string[];
    memoryOperations: number;
    persistenceResults: {
      total: number;
      successful: number;
      failed: number;
      operations: Record<string, number>;
    };
  };
}

// Memory update decision from LLM
export interface MemoryUpdateItem {
  id: string;
  text: string;
  event: "ADD" | "UPDATE" | "DELETE" | "NONE";
  old_memory?: string;
}

// Facts extraction result from LLM
export interface ExtractedFacts {
  facts: string[];
}
