import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;
let clientPromise: Promise<ReturnType<typeof createClient>> | null = null;
let connectionCount = 0;

export async function getRedisClient() {
  // If we have a connected client, return it
  if (client && client.isOpen) {
    console.log(
      `[Redis] Reusing existing connection (count: ${connectionCount})`
    );
    return client;
  }

  // If we're already in the process of creating a client, wait for it
  if (clientPromise) {
    console.log(
      `[Redis] Waiting for existing connection attempt (count: ${connectionCount})`
    );
    return clientPromise;
  }

  console.log(`[Redis] Creating new connection (count: ${connectionCount})`);

  // Create a new client connection
  clientPromise = createRedisClient();

  try {
    client = await clientPromise;
    connectionCount++;
    console.log(`[Redis] Successfully connected (count: ${connectionCount})`);
    return client;
  } catch (error) {
    // Reset the promise so we can try again
    clientPromise = null;
    console.error(`[Redis] Failed to connect:`, error);
    throw error;
  }
}

async function createRedisClient() {
  const newClient = createClient({
    socket: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || "6379"),
      connectTimeout: 10000,
    },
    password: process.env.REDIS_PASSWORD || "",
    username: process.env.REDIS_USERNAME || "default",
    // Disable offline command queuing to prevent multiple requests during reconnection
    disableOfflineQueue: false,
  });

  newClient.on("error", (err) => {
    console.error(`[Redis] Client Error (count: ${connectionCount}):`, err);
    // Reset client and promise on error
    if (client === newClient) {
      client = null;
      connectionCount = Math.max(0, connectionCount - 1);
    }
    clientPromise = null;
  });

  newClient.on("disconnect", () => {
    console.log(`[Redis] Client disconnected (count: ${connectionCount})`);
    client = null;
    clientPromise = null;
    connectionCount = Math.max(0, connectionCount - 1);
  });

  newClient.on("connect", () => {
    console.log(`[Redis] Client connected (count: ${connectionCount})`);
  });

  newClient.on("ready", () => {
    console.log(`[Redis] Client ready (count: ${connectionCount})`);
  });

  await newClient.connect();
  return newClient;
}

// Graceful shutdown function
export async function closeRedisClient() {
  if (client) {
    console.log(`[Redis] Closing client (count: ${connectionCount})`);
    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch (error) {
      console.error("[Redis] Error during quit:", error);
      // Force disconnect if quit fails
      if (client.isOpen) {
        client.disconnect();
      }
    } finally {
      client = null;
      clientPromise = null;
      connectionCount = 0;
    }
  }
}

// Setup graceful shutdown handlers
if (typeof process !== "undefined") {
  const cleanup = async () => {
    console.log("[Redis] Graceful shutdown initiated...");
    await closeRedisClient();
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
  process.on("beforeExit", cleanup);

  // Also handle uncaught exceptions to prevent connection leaks
  process.on("uncaughtException", async (error) => {
    console.error("[Redis] Uncaught exception, closing connections:", error);
    await closeRedisClient();
  });
}
