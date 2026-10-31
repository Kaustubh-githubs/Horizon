import { useQuery } from "@tanstack/react-query"

import { apiRequest } from "@/lib/api"

// The fixed lists behind every filter and dropdown: countries, departments and job titles
// (ADR 0003). Shared by the directory, the forms and the insights page, so they live in their
// own feature instead of in any one of those.

export type Lookups = {
  countries: { id: number; code: string; name: string; currency_code: string }[]
  /** `job_title_ids`: the titles people in the department hold, current or former (ADR 0019). */
  departments: { id: number; name: string; job_title_ids: number[] }[]
  job_titles: { id: number; name: string }[]
}

export const lookupsKey = ["lookups"] as const

export function useLookups() {
  return useQuery({
    queryKey: lookupsKey,
    queryFn: () => apiRequest<Lookups>("/lookups"),
    staleTime: Infinity, // countries, departments and titles rarely change
  })
}
