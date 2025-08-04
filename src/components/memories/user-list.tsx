"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface UserListProps {
  users: string[];
  selectedUser: string | null;
  onUserSelect: (userId: string) => void;
  loading?: boolean;
}

export function UserList({
  users,
  selectedUser,
  onUserSelect,
  loading,
}: UserListProps) {
  if (loading) {
    return (
      <Card className="w-1/4 p-4 !shadow-none !border-none !bg-transparent flex flex-col">
        <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Users</h2>
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </ScrollArea>
      </Card>
    );
  }

  return (
    <Card className="w-1/4 p-4 !shadow-none !border-none !bg-transparent flex flex-col">
      <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Users</h2>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {users.map((userId) => (
            <button
              key={userId}
              onClick={() => onUserSelect(userId)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                selectedUser === userId
                  ? "bg-primary/50 text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {userId}
            </button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
