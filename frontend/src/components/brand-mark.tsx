import { useId } from "react"

import { cn } from "@/lib/utils"

/**
 * Horizon's mark: a sun rising over the horizon, in the loading bar's orange gradient (ADR 0024).
 * Decorative, so screen readers skip it; the name next to it says what it is. public/favicon.svg
 * is the same drawing with the light theme's colours written in.
 */
export function BrandMark({ className }: { className?: string }) {
  // Each mark on the page needs its own gradient id.
  const gradient = useId()

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--progress-from)" }} />
          <stop offset="55%" style={{ stopColor: "var(--progress-via)" }} />
          <stop offset="100%" style={{ stopColor: "var(--progress-to)" }} />
        </linearGradient>
      </defs>
      <path d="M5 15.5a7 7 0 0 1 14 0Z" fill={`url(#${gradient})`} />
      <rect
        x="2"
        y="17.5"
        width="20"
        height="2"
        rx="1"
        fill={`url(#${gradient})`}
      />
      <rect
        x="6"
        y="21"
        width="12"
        height="1.5"
        rx="0.75"
        fill={`url(#${gradient})`}
        opacity="0.6"
      />
    </svg>
  )
}
