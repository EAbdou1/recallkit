"use server";

import { getRedisClient } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { Namespace, UserData, ApiKey } from "@/types";
import { encrypt, decrypt } from "@/lib/encryption";

// Helper function to publish namespace updates
export async function publishNamespaceUpdate(userId: string, action: string) {
  try {
    const redis = await getRedisClient();
    const { getNamespaces } = await import("@/actions/namespace");
    const namespaces = await getNamespaces();
    const hasNamespace = namespaces.length > 0;

    await redis.publish(
      `namespace:${userId}`,
      JSON.stringify({
        hasNamespace,
        namespaceCount: namespaces.length,
        action,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Error publishing namespace update:", error);
  }
}

export async function getApiKeys(): Promise<ApiKey[]> {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  try {
    const redis = await getRedisClient();
    const userDataString = await redis.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };

    // Get all API keys for the user's namespaces
    const apiKeys: ApiKey[] = [];

    for (const namespace of userData.namespaces) {
      // Try to get the encrypted plain API key from storage
      const plainKeyKey = `plainkey:${userId}:${namespace.name}`;
      const encryptedPlainApiKey = await redis.get(plainKeyKey);

      let plainApiKey: string | null = null;
      if (encryptedPlainApiKey) {
        try {
          plainApiKey = decrypt(encryptedPlainApiKey);
        } catch (error) {
          console.error("Failed to decrypt API key:", error);
          // If decryption fails, we'll show masked version
        }
      }

      // Each namespace has exactly one API key
      const apiKey: ApiKey = {
        id: `key_${namespace.name}`,
        name: `${namespace.name} API Key`,
        key: plainApiKey || `key_••••••••••••••••••••••••••••••••`, // Use plain key if available, otherwise masked
        hashedKey: namespace.apiKey,
        created: namespace.createdAt,
        lastUsed: null, // Would be fetched from usage logs in a real implementation
        status: "active",
        namespace: namespace.name,
      };
      apiKeys.push(apiKey);
    }

    return apiKeys;
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return [];
  }
}

export async function regenerateApiKey(
  namespace: string
): Promise<{ success: boolean; apiKey?: string; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const redis = await getRedisClient();
    const userDataString = await redis.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };

    // Check if namespace exists
    const namespaceIndex = userData.namespaces.findIndex(
      (ns: Namespace) => ns.name === namespace
    );
    if (namespaceIndex === -1) {
      return { success: false, error: "Namespace not found" };
    }

    // Remove old API key mapping
    const oldHashedKey = userData.namespaces[namespaceIndex].apiKey;
    await redis.del(`apikey:${oldHashedKey}`);

    // Generate new API key
    const plainApiKey = `key_${nanoid(32)}`;
    const hashedApiKey = Buffer.from(plainApiKey).toString("base64");

    // Update namespace with new API key
    userData.namespaces[namespaceIndex].apiKey = hashedApiKey;

    // Store updated user data and new API key mapping
    await redis
      .multi()
      .set(`user:${userId}`, JSON.stringify(userData))
      .set(`apikey:${hashedApiKey}`, userId)
      .exec();

    // Store encrypted plain key permanently
    const encryptedPlainKey = encrypt(plainApiKey);
    await redis.set(`plainkey:${userId}:${namespace}`, encryptedPlainKey);

    // Publish namespace update
    await publishNamespaceUpdate(userId, "updated");

    revalidatePath("/dashboard/api-keys");
    return { success: true, apiKey: plainApiKey };
  } catch (error) {
    console.error("Failed to regenerate API key:", error);
    return { success: false, error: "Failed to regenerate API key" };
  }
}

export async function deleteApiKey(
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Extract namespace name from apiKeyId (format: key_${namespace})
    const namespace = apiKeyId.replace("key_", "");

    const redis = await getRedisClient();
    const userDataString = await redis.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };

    // Find the namespace
    const namespaceIndex = userData.namespaces.findIndex(
      (ns: Namespace) => ns.name === namespace
    );
    if (namespaceIndex === -1) {
      return { success: false, error: "Namespace not found" };
    }

    // Remove API key mapping from Redis
    const hashedKey = userData.namespaces[namespaceIndex].apiKey;
    await redis.del(`apikey:${hashedKey}`);

    // Remove encrypted plain key from Redis
    await redis.del(`plainkey:${userId}:${namespace}`);

    // Remove namespace from user data
    userData.namespaces.splice(namespaceIndex, 1);

    // If this was the current namespace, clear it or set to first available
    if (userData.currentNamespace === namespace) {
      userData.currentNamespace =
        userData.namespaces.length > 0
          ? userData.namespaces[0].name
          : undefined;
    }

    // Update user data
    await redis.set(`user:${userId}`, JSON.stringify(userData));

    // Publish namespace update
    await publishNamespaceUpdate(userId, "deleted");

    revalidatePath("/dashboard/api-keys");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return { success: false, error: "Failed to delete API key" };
  }
}
