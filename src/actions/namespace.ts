"use server";

import { client } from "@/lib/redis";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import {
  CreateNamespaceSchema,
  CreateState,
  Namespace,
  UserData,
} from "@/types";
import { encrypt } from "@/lib/encryption";

// Helper function to publish namespace updates
export async function publishNamespaceUpdate(userId: string, action: string) {
  try {
    const namespaces = await getNamespaces();
    const hasNamespace = namespaces.length > 0;

    await client.publish(
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

export async function createNamespace(
  prevState: CreateState,
  formData: FormData
): Promise<CreateState> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized access." };
  }

  // Validate form data with Zod
  const validatedFields = CreateNamespaceSchema.safeParse({
    name: formData.get("name"),
  });

  // If validation fails, return errors
  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    const errorMessage = Object.values(fieldErrors).flat().join(", ");
    return {
      error: errorMessage || "Validation failed. Please check the fields.",
    };
  }

  const { name } = validatedFields.data;
  const namespaceSlug = name.toLowerCase().replace(/\s+/g, "-");

  try {
    const userDataString = await client.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };

    if (userData.namespaces.some((ns) => ns.name === namespaceSlug)) {
      return { error: "Namespace with this name already exists." };
    }

    const plainApiKey = `key_${nanoid(32)}`;
    const hashedApiKey = Buffer.from(plainApiKey).toString("base64");

    const newNamespace: Namespace = {
      name: namespaceSlug,
      apiKey: hashedApiKey,
      createdAt: new Date().toISOString(),
    };

    userData.namespaces.push(newNamespace);

    // If this is the user's first namespace, set it as current
    if (userData.namespaces.length === 1) {
      userData.currentNamespace = namespaceSlug;
    }

    await client
      .multi()
      .set(`user:${userId}`, JSON.stringify(userData))
      .set(`apikey:${hashedApiKey}`, userId)
      .exec();

    // Store encrypted plain key permanently
    const encryptedPlainKey = await encrypt(plainApiKey);
    await client.set(`plainkey:${userId}:${namespaceSlug}`, encryptedPlainKey);

    // Publish namespace update
    await publishNamespaceUpdate(userId, "created");

    revalidatePath("/dashboard");
    return {
      newApiKey: plainApiKey,
      namespace: namespaceSlug,
      message: "Successfully created namespace.",
    };
  } catch (err) {
    console.error(err);
    return {
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function getNamespaces(): Promise<Namespace[]> {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  try {
    const userDataString = await client.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };
    return userData.namespaces;
  } catch (error) {
    console.error("Failed to fetch namespaces:", error);
    return [];
  }
}

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

export async function setCurrentNamespace(
  namespaceName: string
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) {
    return false;
  }

  try {
    const userDataString = await client.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };

    // Check if the namespace exists
    const namespaceExists = userData.namespaces.some(
      (ns) => ns.name === namespaceName
    );
    if (!namespaceExists) {
      return false;
    }

    userData.currentNamespace = namespaceName;
    await client.set(`user:${userId}`, JSON.stringify(userData));

    // Publish namespace update
    await publishNamespaceUpdate(userId, "updated");

    revalidatePath("/dashboard");
    return true;
  } catch (error) {
    console.error("Failed to set current namespace:", error);
    return false;
  }
}

export async function getUserData(): Promise<UserData> {
  const { userId } = await auth();
  if (!userId) {
    return { namespaces: [] };
  }

  try {
    const userDataString = await client.get(`user:${userId}`);
    const userData: UserData = userDataString
      ? JSON.parse(userDataString)
      : { namespaces: [] };

    return userData;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return { namespaces: [] };
  }
}
