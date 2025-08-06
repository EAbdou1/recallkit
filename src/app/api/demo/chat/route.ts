import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextRequest } from "next/server";

// Helper function to sanitize text by removing non-ASCII characters
function sanitizeText(text: string): string {
  return text.replace(/[^\x00-\x7F]/g, ""); // Remove non-ASCII characters
}

// Helper function to sanitize messages array
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  [key: string]: unknown;
}

function sanitizeMessages(messages: Message[]): Message[] {
  return messages.map((msg) => ({
    ...msg,
    content: sanitizeText(msg.content || ""),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userId, apiKey } = await req.json();

    if (!messages || !userId || !apiKey) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Sanitize input data to prevent encoding issues
    const sanitizedMessages = sanitizeMessages(messages);
    const sanitizedUserId = sanitizeText(userId);
    const sanitizedApiKey = sanitizeText(apiKey);

    // Log if any sanitization occurred
    const originalLength = JSON.stringify({ messages, userId }).length;
    const sanitizedLength = JSON.stringify({
      messages: sanitizedMessages,
      userId: sanitizedUserId,
    }).length;
    if (originalLength !== sanitizedLength) {
      console.warn("Input data was sanitized - removed non-ASCII characters");
    }

    // 1. Call your RecallKit API to get memories for this specific end-user
    let memories = "";
    try {
      const requestBody = {
        userId: sanitizedUserId, // This is the end-user ID, memories are scoped per end-user
        messages: sanitizedMessages,
      };

      console.log("Calling RecallKit API for end-user:", sanitizedUserId);

      const recallResponse = await fetch(
        `${req.nextUrl.origin}/api/v1/recall`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sanitizedApiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (recallResponse.ok) {
        const recallData = await recallResponse.json();
        memories = recallData.memories || "";

        // Count the actual number of memories by counting the "- " occurrences
        const memoryCount = memories.split("\n- ").length - 1; // Subtract 1 because first line is "From recall memories:"

        console.log(
          "Successfully retrieved memories for user:",
          sanitizedUserId,
          "Number of memories:",
          memoryCount,
          "Memories content:",
          memories
        );
      } else {
        const errorText = await recallResponse.text();
        console.error("RecallKit API error status:", recallResponse.status);
        console.error("RecallKit API error text:", errorText);
      }
    } catch (error) {
      console.error("Error calling RecallKit API:", error);
      // If it's an encoding error, provide more helpful information
      if (error instanceof Error && error.message.includes("ByteString")) {
        console.error(
          "This is likely a character encoding issue. The API key or message content may contain non-ASCII characters."
        );
      }
    }

    // 2. Append memories to the last user message (not in system message)
    const messagesWithMemories = [...sanitizedMessages];
    const lastMessage = messagesWithMemories[messagesWithMemories.length - 1];

    if (lastMessage && lastMessage.role === "user" && memories.trim()) {
      // Also sanitize memories to prevent encoding issues
      const sanitizedMemories = sanitizeText(memories);
      const originalContent = lastMessage.content;
      lastMessage.content = `${lastMessage.content}\n\n[Context from your previous conversations: ${sanitizedMemories}]`;
      console.log(
        "Added memories to user message.",
        "Original content:",
        originalContent,
        "Final content:",
        lastMessage.content
      );
    } else {
      console.log(
        "No memories to add. Last message role:",
        lastMessage?.role,
        "Number of memories:",
        memories.split("\n- ").length - 1,
        "Memories trim length:",
        memories.trim().length
      );
    }

    // 3. Add a simple system message (no memories here)
    const systemMessage = {
      role: "system" as const,
      content:
        "You are a helpful AI assistant. If the user's message includes context from previous conversations, use it to provide more personalized responses.",
    };

    // 4. Combine system message with modified user messages
    const allMessages = [systemMessage, ...messagesWithMemories];

    console.log(
      "Final messages being sent to OpenAI:",
      JSON.stringify(allMessages, null, 2)
    );

    // 5. Stream response from OpenAI
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: allMessages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in demo chat API:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
