import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth } from "@/lib/recall/api-auth";
import {
  retrieveMemories,
  recreateRecallIndex,
  debugMemoryCount,
} from "@/lib/recall/vector-search";
import { inngest } from "@/lib/inngest";
import { z } from "zod";
import type { Message } from "@/types";

// Schema for validating the request body
const recallApiSchema = z.object({
  userId: z.string(), // Just a string identifier - no validation needed
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .min(1, { message: "messages array must contain at least one message." }),
});

/**
 * Formats the retrieved memories into a clean string for the LLM prompt.
 * @param memories An array of memory text strings.
 * @returns A formatted string or an empty string if no memories are found.
 */
function formatMemoriesForPrompt(memories: string[]): string {
  if (memories.length === 0) {
    return "";
  }
  return `From recall memories:\n- ${memories.join("\n- ")}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing API key" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);
    const authResult = await handleApiAuth(apiKey);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { namespace } = authResult;

    // 2. Parse and validate the request body
    const body = await request.json();
    const validation = recallApiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, messages } = validation.data;

    console.log(
      `[/api/v1/recall] Received request for namespace:'${namespace}' and user:'${userId}'`
    );

    // 3. Trigger the background Inngest job
    await inngest.send({
      name: "memory/process",
      data: {
        messages: messages as Message[],
        namespace,
        userId, // This is the end-user ID, not the developer ID
      },
    });
    console.log(
      `[/api/v1/recall] Dispatched memory processing job to Inngest.`
    );

    // 4. In parallel, retrieve relevant memories for the current conversation
    const latestMessage = messages[messages.length - 1].content;
    console.log(
      `[/api/v1/recall] Searching for memories with query: "${latestMessage}"`
    );

    const memories = await retrieveMemories({
      query: latestMessage,
      namespace,
      userId, // Use the end-user's ID to scope the memory search
      topK: 2, // Reduced from 5 to 2 for more selective results
      forceFallback: true, // Use manual similarity calculation for better control
    });

    console.log(
      `[/api/v1/recall] Retrieved ${memories.length} memories:`,
      memories
    );

    const formattedMemories = formatMemoriesForPrompt(memories);
    console.log(`[/api/v1/recall] Formatted memories:`, formattedMemories);

    // 5. Return the retrieved memories to the developer immediately
    return NextResponse.json({
      memories: formattedMemories,
      success: true,
      namespace,
      userId,
    });
  } catch (error) {
    console.error("Error in recall API:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the API key
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing API key" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);
    const authResult = await handleApiAuth(apiKey);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { namespace } = authResult;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    if (action === "recreate-index") {
      try {
        await recreateRecallIndex();
        return NextResponse.json({
          success: true,
          message: "Index recreated successfully",
          namespace,
          userId,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to recreate index",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    // Default action: check status
    const memoryCount = await debugMemoryCount(namespace, userId);

    return NextResponse.json({
      success: true,
      namespace,
      userId,
      memoryCount,
      message:
        "Use ?action=recreate-index to recreate the vector search index if needed",
    });
  } catch (error) {
    console.error("Error in recall API GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
