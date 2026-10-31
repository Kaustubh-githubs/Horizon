import { BarChart3Icon, LogOutIcon, UsersIcon, WalletIcon } from "lucide-react"
import { NavLink, Outlet, ScrollRestoration, useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useCurrentUser, useLogout } from "@/features/auth/session"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/employees", label: "Employees", icon: UsersIcon },
  { to: "/insights", label: "Insights", icon: BarChart3Icon },
  { to: "/budgets", label: "Budgets", icon: WalletIcon },
]

/** The layout around every logged-in page: sidebar navigation, the current user, and logout. */
export function AppShell() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

  const onLogout = () =>
    logout.mutate(undefined, {
      onSuccess: () => void navigate("/login", { replace: true }),
      onError: () => toast.error("Couldn't sign out. Try again."),
    })

  return (
    <div className="flex min-h-svh">
      {/* A new page opens at the top and Back returns to where you were. Filter changes opt
          out of the reset (preventScrollReset), so they keep the scroll position. */}
      <ScrollRestoration />

      {/* The page scrolls in the window (so Back can restore it); the sidebar stays put, with
          the user and Sign out always at its foot. */}
      <aside className="sticky top-0 flex h-svh w-60 shrink-0 flex-col border-r bg-muted/40">
        <div className="px-5 py-4 font-heading text-xl font-semibold">
          Horizon
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  isActive && "bg-background text-foreground shadow-sm",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.persona.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            disabled={logout.isPending}
            aria-label="Sign out"
          >
            <LogOutIcon />
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
