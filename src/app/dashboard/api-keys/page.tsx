import { Suspense } from "react";
import { getApiKeys } from "@/actions/api-keys";
import { ApiKeysClient } from "@/components/api-keys/api-keys-client";
import { ApiKeysSkeleton } from "@/components/ui/api-keys-skeleton";

async function ApiKeysData() {
  const apiKeys = await getApiKeys();
  return <ApiKeysClient apiKeys={apiKeys} />;
}

export default function APIKeysPage() {
  return (
    <div className="overflow-y-auto">
      <Suspense fallback={<ApiKeysSkeleton />}>
        <ApiKeysData />
      </Suspense>
    </div>
  );
}
