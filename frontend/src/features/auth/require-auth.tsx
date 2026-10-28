import { Navigate, Outlet, useLocation } from "react-router"

import { useCurrentUser } from "@/features/auth/session"
import { FullPageMessage } from "@/components/full-page-message"

/** Wraps every page that needs a logged-in user. Others are sent to /login and brought back after. */
export function RequireAuth() {
  const { data: user, isPending, isError } = useCurrentUser()
  const location = useLocation()

  if (isPending) return <FullPageMessage>Loading…</FullPageMessage>
  if (isError)
    return (
      <FullPageMessage>
        Can't reach the server. Try again in a moment.
      </FullPageMessage>
    )
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
