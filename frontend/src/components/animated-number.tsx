import NumberFlow from "@number-flow/react"
import { useEffect, useState } from "react"

import { formatNumber, type NumberOptions } from "@/lib/format"

// Numbers that have already rolled in since the app loaded. A full page load (or a hard
// refresh) starts with none.
const rolled = new Set<string>()

/**
 * A headline number whose digits roll up from zero the first time it shows after the app
 * loads, like an odometer (NumberFlow). After that, coming back to the page or changing a
 * filter shows the new number straight away: the motion is a welcome, not something to watch
 * on every click.
 *
 * `prefix`, `suffix`, `locales` and `format` describe how it's written, the same way as the
 * plain text (see `compactMoney`), so the rolling number ends exactly as the figure reads
 * elsewhere. It rolls in its final unit ("₹0 Cr" to "₹6,021.83 Cr"), never switching from
 * lakh to crore on the way. Screen readers get the final value only, and NumberFlow skips the
 * motion when the OS asks for reduced motion.
 */
export function AnimatedNumber({
  id,
  value,
  prefix,
  suffix,
  locales = "en",
  format = { maximumFractionDigits: 0 },
}: {
  /** Which number this is, e.g. "insights.headcount", so it rolls in only once. */
  id: string
  value: number
  prefix?: string
  suffix?: string
  locales?: string
  format?: NumberOptions
}) {
  const [firstTime] = useState(() => !rolled.has(id))
  // The first time, the first frame shows zero, so there's something to roll up from.
  const [atZero, setAtZero] = useState(firstTime)
  // Animated only for the roll-in; after it, a new value just replaces the old.
  const [rolling, setRolling] = useState(firstTime)

  useEffect(() => {
    rolled.add(id)
    if (!firstTime) return
    const frame = requestAnimationFrame(() => setAtZero(false))
    return () => cancelAnimationFrame(frame)
  }, [id, firstTime])

  return (
    <>
      {/* The digits are drawn in NumberFlow's shadow DOM, which text tools and some screen
          readers don't read; this plain copy of the final value is what they get. */}
      <span className="sr-only">
        {`${prefix ?? ""}${formatNumber(value, locales, format)}${suffix ?? ""}`}
      </span>
      <NumberFlow
        aria-hidden="true"
        value={atZero ? 0 : value}
        prefix={prefix}
        suffix={suffix}
        locales={locales}
        format={format}
        animated={rolling}
        onAnimationsFinish={() => setRolling(false)}
      />
    </>
  )
}
