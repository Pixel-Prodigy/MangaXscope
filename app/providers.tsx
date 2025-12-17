"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, useEffect } from "react";

/**
 * BLAZING FAST CACHING CONFIGURATION
 * 
 * - staleTime: Data considered fresh for 10 minutes (won't refetch)
 * - gcTime: Keep unused data in cache for 30 minutes
 * - refetchOnMount: Only refetch if data is stale
 * - refetchOnReconnect: Background refresh when coming back online
 */
const QUERY_CONFIG = {
  // Data stays fresh for 10 minutes - no unnecessary refetches
  staleTime: 10 * 60 * 1000,
  // Keep data in cache for 30 minutes even if unused
  gcTime: 30 * 60 * 1000,
  // Don't refetch on mount if data is fresh
  refetchOnMount: false,
  // Don't refetch when window regains focus
  refetchOnWindowFocus: false,
  // Background refresh when reconnecting
  refetchOnReconnect: "always" as const,
  // Retry failed requests with exponential backoff
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: QUERY_CONFIG,
        },
      })
  );

  // Prevent scroll restoration issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Disable automatic scroll restoration
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      
      // Ensure initial scroll position is at top
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, []);

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
