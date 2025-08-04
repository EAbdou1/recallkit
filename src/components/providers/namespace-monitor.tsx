"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

interface NamespaceMonitorProps {
  children: React.ReactNode;
}

export function NamespaceMonitor({ children }: NamespaceMonitorProps) {
  const { userId } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasNamespace, setHasNamespace] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsChecking(false);
      return;
    }

    let eventSource: EventSource | null = null;

    const setupSSE = () => {
      try {
        // Create Server-Sent Events connection for real-time updates
        eventSource = new EventSource(`/api/namespace-events?userId=${userId}`);

        eventSource.onopen = () => {
          console.log("SSE connection established");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "namespace_update") {
              setHasNamespace(data.hasNamespace);

              if (!data.hasNamespace) {
                router.push("/new-namespace");
              }
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          // Reconnect after a delay
          setTimeout(() => {
            if (eventSource) {
              eventSource.close();
              setupSSE();
            }
          }, 5000);
        };

        // Initial check
        const initialCheck = async () => {
          try {
            const response = await fetch("/api/check-namespace", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (response.ok) {
              const data = await response.json();
              setHasNamespace(data.hasNamespace);

              if (!data.hasNamespace) {
                router.push("/new-namespace");
              }
            } else {
              console.error("Failed to check namespace");
              router.push("/new-namespace");
            }
          } catch (error) {
            console.error("Error checking namespace:", error);
            router.push("/new-namespace");
          } finally {
            setIsChecking(false);
          }
        };

        initialCheck();
      } catch (error) {
        console.error("Error setting up SSE:", error);
        setIsChecking(false);
      }
    };

    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [userId, router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render children if user has a namespace
  if (!hasNamespace) {
    return null;
  }

  return <>{children}</>;
}
