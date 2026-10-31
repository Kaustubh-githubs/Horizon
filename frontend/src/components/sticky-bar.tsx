import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Keeps a page's filters at the top of the window while the page scrolls under them, from tablet
 * width up. On a phone the filters wrap to four rows, a third of the screen, so there they scroll
 * away with the page. It spans the page's padding (the shell's `p-8`) so rows don't show at its
 * sides, and gets a line and a shadow only once it's stuck, so the page looks unchanged at the top.
 */
export function StickyBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  // Stuck at `top: 0`, the bar's top edge sits outside a root shrunk by 1px at the top, so it's
  // no longer fully visible. Below the top of the window it is.
  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(entry.intersectionRatio < 1),
      { rootMargin: "-1px 0px 0px 0px", threshold: 1 },
    )
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        // The negative margins cancel the padding where it isn't stuck, so the layout around it
        // is the same as without the bar.
        "-mx-4 -my-3 flex flex-col gap-3 border-b border-transparent bg-background px-4 py-3 transition-shadow md:sticky md:top-0 md:z-20 md:-mx-8 md:px-8",
        stuck && "md:border-border md:shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  )
}
