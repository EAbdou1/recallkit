import { Suspense } from "react";
import { getCurrentNamespace } from "@/actions/namespace";
import { getRedisClient } from "@/lib/redis";
import { MemoriesClient } from "@/components/memories/memories-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memories - RecallKit",
  description: "Memories - RecallKit",
};

async function getUsersForNamespace(namespace: string) {
  try {
    const redis = await getRedisClient();
    const keys = await redis.keys(`memories:${namespace}:*:ids`);
    const userIds = keys.map((key) => {
      const parts = key.split(":");
      return parts[2];
    });
    return userIds;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}

export default async function MemoriesPage() {
  const namespace = await getCurrentNamespace();

  if (!namespace) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Memories </h1>
        <div className="text-center py-8 text-muted-foreground">
          No namespace found. Please create a namespace first.
        </div>
      </div>
    );
  }

  const users = await getUsersForNamespace(namespace);

  return (
    <div className="container mx-auto ">
      <h1 className="text-2xl font-bold mb-6">
        Memories
        <span className="text-lg font-normal text-muted-foreground ml-2">
          (For {namespace})
        </span>
      </h1>

      <Suspense fallback={<div>Loading...</div>}>
        <MemoriesClient initialUsers={users} namespace={namespace} />
      </Suspense>
    </div>
  );
}
