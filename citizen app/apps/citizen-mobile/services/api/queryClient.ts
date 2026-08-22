import { QueryClient } from '@tanstack/react-query';

import { toApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Small helper screens use to render a consistent message regardless of
 * where the error came from (section 47). */
export { toApiError };
