import type { FiltersApplied, SegmentBy } from "@/features/insights/api"

/**
 * Who a figure is about, as the API applied the filters, e.g. "Active employees in Engineering
 * with 1–3 years at ACME in India". `who` starts the sentence.
 */
export function describeScope(
  filters: FiltersApplied,
  who = "Active employees",
): string {
  const { country, department, job_title, tenure } = filters
  return [
    who,
    department && `in ${department.name}`,
    job_title && `working as ${job_title.name}`,
    tenure && `with ${tenure.label.toLowerCase()} at ACME`,
    country && `in ${country.name}`,
  ]
    .filter(Boolean)
    .join(" ")
}

/** How each grouping is named in text ("Median pay by job title"). */
export const SEGMENT_NAMES: Record<SegmentBy, string> = {
  country: "country",
  department: "department",
  job_title: "job title",
  tenure: "tenure",
}

/** The "Group by" choices, in order. */
export const GROUP_BY_OPTIONS: { by: SegmentBy; label: string }[] = [
  { by: "country", label: "Country" },
  { by: "department", label: "Department" },
  { by: "job_title", label: "Job title" },
  { by: "tenure", label: "Tenure" },
]

/** Tenure bands, matching the API's (ADR 0019). */
export const TENURE_BANDS: { key: string; label: string }[] = [
  { key: "under_1", label: "Under 1 year" },
  { key: "1_3", label: "1–3 years" },
  { key: "3_5", label: "3–5 years" },
  { key: "5_10", label: "5–10 years" },
  { key: "10_plus", label: "10+ years" },
]
