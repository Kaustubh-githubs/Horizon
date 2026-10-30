import { QueryCache, QueryClient } from "@tanstack/react-query"

import { sessionQueryKey } from "@/features/auth/session"
import { ApiError, isUnauthorized } from "@/lib/api"

// If any request comes back 401 (for example the session expired), mark the user as
// logged out. The route guard then sends them to the login page.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isUnauthorized(error)) queryClient.setQueryData(sessionQueryKey, null)
    },
  }),
  defaultOptions: {
    queries: {
      // Retry network and server errors, but not 4xx answers (401, 404, …): asking again won't change them.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
})
