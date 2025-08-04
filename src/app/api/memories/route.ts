import { getRedisClient } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get("namespace") || "noterx-studio";

    const redis = await getRedisClient();

    // Get all memory keys for the namespace
    const keys = await redis.keys(`memories:${namespace}:*:ids`);
    console.log(
      `Found ${keys.length} memory keys for namespace ${namespace}:`,
      keys
    );

    // Extract user IDs from the keys
    const userIds = keys.map((key) => {
      const parts = key.split(":");
      return parts[2]; // Get the userId part from memories:namespace:userId:ids
    });

    console.log(`Extracted user IDs:`, userIds);
    return NextResponse.json({ userIds });
  } catch (error) {
    console.error("Failed to fetch memory keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch memory keys" },
      { status: 500 }
    );
  }
}
