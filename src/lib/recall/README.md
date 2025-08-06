# RecallKit Memory Management System

This module provides intelligent memory management capabilities for storing, retrieving, and managing user memories from conversations.

## Architecture Overview

The system has been refactored into focused, single-responsibility modules for better maintainability and understandability:

### Core Modules

#### `memory-processor.ts`

- **Purpose**: Main orchestrator for the memory processing workflow
- **Key Function**: `processMemory` - The Inngest function that coordinates the entire process
- **Responsibilities**:
  - Input validation
  - Step coordination
  - Result assembly

#### `fact-extraction.ts`

- **Purpose**: Extracts facts from conversations using AI
- **Key Function**: `extractFactsFromConversation`
- **Responsibilities**:
  - Message processing
  - AI prompt generation
  - Fact extraction

#### `memory-reconciliation.ts`

- **Purpose**: Reconciles new facts with existing memories
- **Key Function**: `reconcileMemoriesWithFacts`
- **Responsibilities**:
  - Memory retrieval
  - AI-based reconciliation
  - Update decision generation

#### `memory-storage.ts`

- **Purpose**: Handles persistence operations in Redis
- **Key Function**: `persistMemoryOperations`
- **Responsibilities**:
  - CRUD operations (ADD, UPDATE, DELETE)
  - Redis pipeline management
  - Error handling

### Utility Modules

#### `embedding-service.ts`

- **Purpose**: AI embedding generation
- **Key Function**: `createTextEmbedding`
- **Responsibilities**:
  - OpenAI embedding API calls
  - Error handling for embedding failures

#### `redis-utils.ts`

- **Purpose**: Redis utility functions
- **Key Functions**:
  - `createMemoryKey` - Generates Redis keys
  - `fetchUserMemories` - Retrieves user memories
- **Responsibilities**:
  - Redis key management
  - Memory retrieval logic

#### `schemas.ts`

- **Purpose**: Zod validation schemas
- **Key Schemas**:
  - `FactsSchema` - Validates extracted facts
  - `MemoryUpdateSchema` - Validates memory updates
- **Responsibilities**:
  - Runtime validation
  - Type safety

#### `result-processor.ts`

- **Purpose**: Result processing and summary generation
- **Key Functions**:
  - `processPersistenceResults` - Analyzes operation results
  - `createProcessingResult` - Creates final result objects
  - `createNoFactsResult` - Handles early exits
- **Responsibilities**:
  - Result aggregation
  - Summary statistics
  - Error reporting

## Usage

### Basic Usage

```typescript
import { processMemory } from "./memory-processor";

// The processMemory function is automatically triggered by Inngest events
// with the event type "memory/process"
```

### Individual Services

```typescript
import {
  extractFactsFromConversation,
  reconcileMemoriesWithFacts,
  persistMemoryOperations,
} from "./index";

// Use individual services as needed
const facts = await extractFactsFromConversation(messages, namespace, userId);
const updates = await reconcileMemoriesWithFacts(facts, namespace, userId);
const results = await persistMemoryOperations(
  namespace,
  userId,
  updates.memory
);
```

## Benefits of the New Structure

1. **Single Responsibility**: Each module has a clear, focused purpose
2. **Testability**: Individual functions can be easily unit tested
3. **Maintainability**: Changes to one aspect don't affect others
4. **Readability**: Smaller files are easier to understand
5. **Reusability**: Functions can be used independently
6. **Error Isolation**: Issues are contained within specific modules

## Migration Notes

The original `manager.ts` file has been replaced with a simple re-export file for backward compatibility. All existing imports should continue to work without changes.

## File Structure

```
src/lib/recall/
├── index.ts                 # Main exports
├── manager.ts               # Backward compatibility re-exports
├── memory-processor.ts      # Main orchestrator
├── fact-extraction.ts       # Fact extraction service
├── memory-reconciliation.ts # Memory reconciliation service
├── memory-storage.ts        # Redis persistence service
├── embedding-service.ts     # AI embedding service
├── redis-utils.ts          # Redis utilities
├── schemas.ts              # Validation schemas
├── result-processor.ts     # Result processing utilities
├── prompts.ts              # AI prompts (existing)
└── README.md               # This documentation
```
