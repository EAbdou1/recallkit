import { getRedisClient } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get("namespace") || "noterx-studio";
    const userId = params.userId;

    const redis = await getRedisClient();
    const memoryKey = `memories:${namespace}:${userId}`;

    // Get all memory IDs for this user
    const memoryIds = await redis.sMembers(`${memoryKey}:ids`);

    console.log(`Found ${memoryIds.length} memory IDs for user ${userId}`);

    const memories = [];
    for (const memoryId of memoryIds) {
      try {
        const memoryData = (await redis.json.get(`${memoryKey}:${memoryId}`, {
          path: "$",
        })) as Array<{
          id: string;
          text: string;
          embedding?: number[];
          namespace: string;
          userId: string;
          createdAt: string;
          updatedAt: string;
        }>;

        console.log(`Memory ${memoryId} data:`, memoryData);

        if (memoryData && memoryData[0]) {
          // Extract only the fields we need for the frontend
          const memory = {
            id: memoryData[0].id,
            text: memoryData[0].text,
            createdAt: memoryData[0].createdAt,
            updatedAt: memoryData[0].updatedAt,
          };
          memories.push(memory);
        }
      } catch (error) {
        console.error(`Failed to retrieve memory ${memoryId}:`, error);
      }
    }

    console.log(`Returning ${memories.length} memories for user ${userId}`);
    return NextResponse.json({ memories });
  } catch (error) {
    console.error("Failed to fetch memories:", error);
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 }
    );
  }
}
