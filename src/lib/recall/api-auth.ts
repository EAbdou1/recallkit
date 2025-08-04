import { getRedisClient } from "@/lib/redis";
import type { UserData } from "@/types";

// The successful result contains both namespace and developerUserId
interface AuthResult {
  success: true;
  namespace: string;
  developerUserId: string; // The Clerk User ID of the key owner
}

interface AuthFailure {
  success: false;
  error: string;
  status: 401 | 403 | 500;
}

export async function handleApiAuth(
  apiKey: string
): Promise<AuthResult | AuthFailure> {
  try {
    const redis = await getRedisClient();
    const hashedApiKey = btoa(apiKey);
    const userId = await redis.get(`apikey:${hashedApiKey}`);

    if (!userId) {
      return { success: false, error: "Invalid API Key.", status: 401 };
    }

    const userDataString = await redis.get(`user:${userId}`);
    if (!userDataString) {
      console.error(
        `Inconsistency: API key found for user ${userId}, but user data is missing.`
      );
      return {
        success: false,
        error: "User data not found for API key.",
        status: 500,
      };
    }

    const userData: UserData = JSON.parse(userDataString);
    const namespace = userData.namespaces.find(
      (ns) => ns.apiKey === hashedApiKey
    );

    if (!namespace) {
      console.error(
        `Inconsistency: User ${userId} data does not contain the namespace for the provided key.`
      );
      return {
        success: false,
        error: "Namespace not found for API key.",
        status: 500,
      };
    }

    // Return both namespace and developerUserId on success
    return {
      success: true,
      namespace: namespace.name,
      developerUserId: userId, // The Clerk User ID of the API key owner
    };
  } catch (error) {
    console.error("Error during API authentication:", error);
    return {
      success: false,
      error: "Internal Server Error during authentication.",
      status: 500,
    };
  }
}
