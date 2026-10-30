import { ArrowLeftIcon } from "lucide-react"
import { Link } from "react-router"

export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" />
      {children}
    </Link>
  )
}
