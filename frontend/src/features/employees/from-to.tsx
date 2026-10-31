import { ArrowRightIcon } from "lucide-react"
import type { ReactNode } from "react"

/**
 * "old → new", or just "new" when the value was first set (ADR 0021). The arrow is read out as
 * "changed to". Used by the timeline and the audit log, so both read the same.
 */
export function FromTo({ from, to }: { from: ReactNode; to: ReactNode }) {
  return (
    <>
      {from !== null && from !== undefined && (
        <>
          <span className="text-muted-foreground">{from}</span>{" "}
          <ArrowRightIcon
            className="inline size-4 align-text-bottom text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">changed to</span>{" "}
        </>
      )}
      <span>{to}</span>
    </>
  )
}
