/**
 * RecallKit Memory Management System
 *
 * This module provides intelligent memory management capabilities for storing,
 * retrieving, and managing user memories from conversations.
 */

// Main processing function
export { processMemory } from "./manager";

// LLM prompts
export { FACT_RETRIEVAL_PROMPT, getUpdateMemoryPrompt } from "./prompts";
