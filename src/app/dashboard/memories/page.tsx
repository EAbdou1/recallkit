import { Suspense } from "react";
import { getCurrentNamespace } from "@/actions/namespace";
import { MemoriesClient } from "@/components/memories/memories-client";
import { Metadata } from "next";
import { getUsersForNamespace } from "@/data/memories";

export const metadata: Metadata = {
  title: "Memories - RecallKit",
  description: "Memories - RecallKit",
};

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

  try {
    const userIds = await getUsersForNamespace(namespace);

    return (
      <div className="container mx-auto ">
        <h1 className="text-2xl font-bold mb-6">
          Memories
          <span className="text-lg font-normal text-muted-foreground ml-2">
            (For {namespace})
          </span>
        </h1>

        <Suspense fallback={<div>Loading...</div>}>
          <MemoriesClient initialUsers={userIds} namespace={namespace} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("Failed to load users:", error);
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Memories</h1>
        <div className="text-center py-8 text-muted-foreground">
          Failed to load users. Please try again later.
        </div>
      </div>
    );
  }
}
