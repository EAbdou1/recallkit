"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { UserList } from "./user-list";
import { MemoriesTable } from "./memories-table";
import { Separator } from "../ui/separator";

interface MemoriesClientProps {
  initialUsers: string[];
  namespace: string;
}

export function MemoriesClient({
  initialUsers,
  namespace,
}: MemoriesClientProps) {
  const [users, setUsers] = useState<string[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<string | null>(
    initialUsers.length > 0 ? initialUsers[0] : null
  );

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
  };

  return (
    <div className="flex gap-4 border rounded-lg h-[calc(100vh-170px)]">
      <UserList
        users={users}
        selectedUser={selectedUser}
        onUserSelect={handleUserSelect}
      />
      <div className="border-l flex-1 flex flex-col">
        <Card className="flex-1 p-4 !shadow-none !border-none !bg-transparent flex flex-col">
          <h2 className="text-lg font-semibold mb-4 flex-shrink-0">
            {selectedUser ? `Memories for ${selectedUser}` : "Select a user"}
          </h2>
          <div className="flex-1 overflow-hidden">
            <MemoriesTable userId={selectedUser} namespace={namespace} />
          </div>
        </Card>
      </div>
    </div>
  );
}
