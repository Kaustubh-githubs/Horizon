import { MoonIcon, SunIcon, type LucideIcon } from "lucide-react"

import { setTheme, useTheme, type Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const OPTIONS: { theme: Theme; label: string; icon: LucideIcon }[] = [
  { theme: "light", label: "Light", icon: SunIcon },
  { theme: "dark", label: "Dark", icon: MoonIcon },
]

/** Light or dark: two icon buttons, the current one raised. */
export function ThemeSwitcher() {
  const current = useTheme()

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">Theme</span>
      <div
        role="group"
        aria-label="Theme"
        className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
      >
        {OPTIONS.map(({ theme, label, icon: Icon }) => (
          <button
            key={theme}
            type="button"
            aria-label={label}
            aria-pressed={current === theme}
            title={label}
            onClick={() => setTheme(theme)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              current === theme && "bg-background text-brand-strong shadow-sm",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
