"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Memory, getMemoriesByUser } from "@/data/memories";

interface MemoriesTableProps {
  userId: string | null;
  namespace: string;
}

export function MemoriesTable({ userId, namespace }: MemoriesTableProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !namespace) {
      setMemories([]);
      return;
    }

    const fetchUserMemories = async () => {
      setLoading(true);
      try {
        const userMemories = await getMemoriesByUser(namespace, userId);
        setMemories(userMemories);
      } catch (error) {
        console.error("Failed to fetch memories for user:", error);
        setMemories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserMemories();
  }, [userId, namespace]);

  if (loading) {
    return <MemoriesTableSkeleton />;
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No memories found for this user.
      </div>
    );
  }

  return (
    <div className="border rounded-lg h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>Text</TableHead>
            <TableHead className="w-48">Created At</TableHead>
            <TableHead className="w-48">Updated At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memories.map((memory) => (
            <TableRow key={memory.id}>
              <TableCell className="font-mono text-sm">{memory.id}</TableCell>
              <TableCell className="max-w-md">
                <div className="truncate" title={memory.text}>
                  {memory.text}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(memory.createdAt).toLocaleString()}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(memory.updatedAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MemoriesTableSkeleton() {
  return (
    <div className="border rounded-lg h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>Text</TableHead>
            <TableHead className="w-48">Created At</TableHead>
            <TableHead className="w-48">Updated At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-full max-w-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
