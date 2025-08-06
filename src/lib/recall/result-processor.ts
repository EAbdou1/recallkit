import type { MemoryOperationResult, ProcessMemoryResult } from "../../types";

/**
 * Processes persistence results and generates summary statistics
 */
export function processPersistenceResults(
  results: MemoryOperationResult[],
  namespace: string,
  userId: string
): {
  results: MemoryOperationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    operations: Record<string, number>;
  };
} {
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const operationCounts = results.reduce((acc, r) => {
    acc[r.operation] = (acc[r.operation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(
    `[${namespace}/${userId}] Persistence complete: ${successCount} succeeded, ${failureCount} failed`
  );
  console.log(
    `[${namespace}/${userId}] Operations: ${JSON.stringify(operationCounts)}`
  );

  if (failureCount > 0) {
    const failures = results.filter((r) => !r.success);
    console.error(`[${namespace}/${userId}] Failed operations:`, failures);
  }

  return {
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failureCount,
      operations: operationCounts,
    },
  };
}

/**
 * Creates a comprehensive result object for the memory processing job
 */
export function createProcessingResult(
  factsProcessed: number,
  memoriesChanged: number,
  operationsSummary: Record<string, number>,
  details: {
    extractedFacts: string[];
    memoryOperations: number;
    persistenceResults: {
      total: number;
      successful: number;
      failed: number;
      operations: Record<string, number>;
    };
  }
): ProcessMemoryResult {
  return {
    status: "complete",
    factsProcessed,
    memoriesChanged,
    operationsSummary,
    details,
  };
}

/**
 * Creates an early exit result when no facts are found
 */
export function createNoFactsResult(): ProcessMemoryResult {
  return {
    status: "complete",
    reason: "No new facts found.",
    factsProcessed: 0,
    memoriesChanged: 0,
  };
}
