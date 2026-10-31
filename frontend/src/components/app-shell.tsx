import {
  BarChart3Icon,
  LogOutIcon,
  MenuIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import {
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router"
import { toast } from "sonner"

import { BrandMark } from "@/components/brand-mark"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useCurrentUser, useLogout } from "@/features/auth/session"
import { useFocusPageHeading } from "@/hooks/use-focus-page-heading"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/employees", label: "Employees", icon: UsersIcon },
  { to: "/insights", label: "Insights", icon: BarChart3Icon },
  { to: "/budgets", label: "Budgets", icon: WalletIcon },
]

/**
 * The layout around every logged-in page: navigation, the theme switch, the current user and
 * Sign out. From tablet width up they're a sidebar; on a phone, a top bar opens them in a menu,
 * so the page gets the whole width.
 */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Set when the phone menu closes because a page was picked: focus then belongs to the new
  // page's heading, not back on the menu button (where closing with Escape returns it).
  const pagePicked = useRef(false)
  useFocusPageHeading(useLocation().pathname)

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* A new page opens at the top and Back returns to where you were. Filter changes opt
          out of the reset (preventScrollReset), so they keep the scroll position. */}
      <ScrollRestoration />

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <Brand />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open the menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 gap-0 bg-background p-0 sm:max-w-72"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              if (pagePicked.current) event.preventDefault()
              pagePicked.current = false
            }}
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarContent
              onNavigate={() => {
                pagePicked.current = true
                setMenuOpen(false)
              }}
            />
          </SheetContent>
        </Sheet>
      </header>

      {/* The page scrolls in the window (so Back can restore it); the sidebar stays put, with
          the user and Sign out always at its foot. */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-muted/40 md:flex">
        <SidebarContent />
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <BrandMark />
      <span className="font-heading text-xl font-semibold">Horizon</span>
    </div>
  )
}

/** The sidebar's contents; in the phone menu, picking a page closes the menu (`onNavigate`). */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

  const onLogout = () =>
    logout.mutate(undefined, {
      onSuccess: () => void navigate("/login", { replace: true }),
      onError: () => toast.error("Couldn't sign out. Try again."),
    })

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-4">
        <Brand />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                // The current page: brand-tinted, with an orange bar at its edge.
                isActive &&
                  "bg-brand-soft text-brand-strong before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand hover:bg-brand-soft hover:text-brand-strong",
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-4 py-3">
        <ThemeSwitcher />
      </div>

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
    </div>
  )
}
