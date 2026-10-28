import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiRequest, isUnauthorized } from "@/lib/api"

export type CurrentUser = {
  id: number
  name: string
  email_address: string
  persona: { key: string; name: string }
}

type SessionResponse = { user: CurrentUser }

export type LoginInput = { email_address: string; password: string }

export const sessionQueryKey = ["session"] as const

/** The logged-in user, or `null` when nobody is logged in (the API answers 401). */
export function useCurrentUser() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async (): Promise<CurrentUser | null> => {
      try {
        return (await apiRequest<SessionResponse>("/session")).user
      } catch (error) {
        if (isUnauthorized(error)) return null
        throw error
      }
    },
    retry: false,
    staleTime: Infinity,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest<SessionResponse>("/session", { method: "POST", body: input }),
    onSuccess: ({ user }) => queryClient.setQueryData(sessionQueryKey, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiRequest<void>("/session", { method: "DELETE" }),
    // Drop every cached response so the next user never sees the previous one's data.
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(sessionQueryKey, null)
    },
  })
}
