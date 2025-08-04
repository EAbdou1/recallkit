import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getNamespaces } from "@/actions/namespace";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const namespaces = await getNamespaces();
    const hasNamespace = namespaces.length > 0;

    return NextResponse.json({
      hasNamespace,
      namespaceCount: namespaces.length,
    });
  } catch (error) {
    console.error("Error checking namespace:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
