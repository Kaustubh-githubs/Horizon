import { ChevronRightIcon } from "lucide-react"
import { Link } from "react-router"

export type Crumb = { label: string; to?: string }

/**
 * Where a nested page sits, e.g. "Employees › Asha Rao › Edit". Each step with a `to` links
 * back to it; the last is the page itself.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li
            key={`${index}-${item.label}`}
            className="inline-flex min-w-0 items-center gap-1.5"
          >
            {index > 0 && (
              <ChevronRightIcon
                className="size-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {item.to ? (
              <Link
                to={item.to}
                className="truncate hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
