import type { SegmentBy } from "@/features/insights/api"

/** How each segment is named in text ("Median pay by job title"). */
export const SEGMENT_NAMES: Record<SegmentBy, string> = {
  country: "country",
  department: "department",
  job_title: "job title",
  tenure: "tenure",
}

/** The tabs, in order. */
export const SEGMENT_TABS: { by: SegmentBy; label: string }[] = [
  { by: "country", label: "Country" },
  { by: "department", label: "Department" },
  { by: "job_title", label: "Job title" },
  { by: "tenure", label: "Tenure" },
]
