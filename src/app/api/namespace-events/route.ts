import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNamespaces } from "@/actions/namespace";
import { client } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const requestUserId = url.searchParams.get("userId");

    if (requestUserId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    // Set up SSE headers
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          const event = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(event));
        };

        // Send initial namespace status
        try {
          const namespaces = await getNamespaces();
          const hasNamespace = namespaces.length > 0;

          sendEvent({
            type: "namespace_update",
            hasNamespace,
            namespaceCount: namespaces.length,
          });
        } catch (error) {
          console.error("Error getting initial namespace status:", error);
          sendEvent({
            type: "error",
            message: "Failed to get namespace status",
          });
        }

        // Set up Redis Pub/Sub for real-time updates
        let redisSubscriber: any = null;

        try {
          // Create a separate connection for pub/sub
          redisSubscriber = client.duplicate();
          await redisSubscriber.connect();

          // Subscribe to namespace changes for this user
          await redisSubscriber.subscribe(
            `namespace:${userId}`,
            (message: string) => {
              try {
                const data = JSON.parse(message);
                sendEvent({
                  type: "namespace_update",
                  hasNamespace: data.hasNamespace,
                  namespaceCount: data.namespaceCount,
                  action: data.action, // 'created', 'deleted', 'updated'
                });
              } catch (error) {
                console.error("Error parsing namespace update:", error);
              }
            }
          );

          // Keep connection alive with heartbeat
          const heartbeat = setInterval(() => {
            sendEvent({ type: "heartbeat", timestamp: Date.now() });
          }, 30000);

          // Cleanup on close
          request.signal.addEventListener("abort", () => {
            clearInterval(heartbeat);
            if (redisSubscriber) {
              redisSubscriber.unsubscribe(`namespace:${userId}`);
              redisSubscriber.disconnect();
            }
            controller.close();
          });
          await redisSubscriber.disconnect();
        } catch (error) {
          console.error("Error setting up Redis Pub/Sub:", error);
          sendEvent({
            type: "error",
            message: "Failed to set up real-time monitoring",
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error("Error in namespace events:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
