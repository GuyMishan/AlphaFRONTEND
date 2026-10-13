import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api/errors";

/**
 * Server-state defaults for Alpha:
 * - data is revalidated whenever a screen mounts (staleTime 0), so a visit always
 *   reflects changes made elsewhere; cached data renders instantly meanwhile and is
 *   kept 5 minutes after the last observer;
 * - no refetch on focus/reconnect (the app does not poll; screens refetch explicitly);
 * - queries retry once, only for transient failures (network, timeout, 5xx);
 * - mutations never retry automatically (they are not guaranteed idempotent).
 */
function isTransient(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return error.kind === "network" || error.kind === "timeout" || (error.kind === "http" && error.status >= 500);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: (failureCount, error) => failureCount < 1 && isTransient(error),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One QueryClient per browser tab (a fresh one per server render).
 * Also used outside React, e.g. to clear user data on logout.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return createQueryClient();
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}
