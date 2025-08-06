"use server";

import { client } from "@/lib/redis";
import { UserData } from "@/types";
import { auth } from "@clerk/nextjs/server";

export async function getCurrentNamespace(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  try {
    const userDataString = await client.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };

    // If user has a current namespace set, return it
    if (userData.currentNamespace) {
      return userData.currentNamespace;
    }

    // If no current namespace is set but there are namespaces, return the first one
    if (userData.namespaces.length > 0) {
      return userData.namespaces[0].name;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch current namespace:", error);
    return null;
  }
}
