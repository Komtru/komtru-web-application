import { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | undefined;

/**
 * Lazily-created module singleton. Server renders get a fresh client per call
 * site; the browser reuses one for the lifetime of the tab.
 */
export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }

  return queryClient;
}
