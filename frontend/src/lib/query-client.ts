import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import { sessionQueryKey } from "@/features/auth/session"
import { ApiError, isUnauthorized } from "@/lib/api"

// If any request comes back 401 (for example the session expired, ADR 0009), mark the user as
// logged out. The route guard then sends them to the login page and back afterwards. Saves too,
// not just reads: otherwise a save after the session ended would only show "You need to sign in
// first" on a page where every save fails.
const signOutOnUnauthorized = (error: unknown) => {
  if (isUnauthorized(error)) queryClient.setQueryData(sessionQueryKey, null)
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: signOutOnUnauthorized }),
  mutationCache: new MutationCache({ onError: signOutOnUnauthorized }),
  defaultOptions: {
    queries: {
      // Retry network and server errors, but not 4xx answers (401, 404, …): asking again won't change them.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
})
