import { QueryCache, QueryClient } from "@tanstack/react-query"

import { sessionQueryKey } from "@/features/auth/session"
import { isUnauthorized } from "@/lib/api"

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
      retry: (failureCount, error) =>
        !isUnauthorized(error) && failureCount < 2,
    },
  },
})
