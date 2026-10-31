import type { Lookups } from "@/features/lookups/api"

// The Job title filter follows the Department filter (ADR 0019): with a department picked, it
// offers only the titles people there hold. Used by the directory and the insights page.

/** The job titles to offer: the department's, or every title when no department is picked. */
export function titlesForDepartment(
  lookups: Lookups | undefined,
  departmentId: string | undefined,
): Lookups["job_titles"] {
  const titles = lookups?.job_titles ?? []
  if (!departmentId) return titles

  const held = lookups?.departments.find(
    (department) => String(department.id) === departmentId,
  )?.job_title_ids
  return held ? titles.filter((title) => held.includes(title.id)) : titles
}

/**
 * The filter changes for picking a department: a picked title nobody in the new department
 * holds is dropped too, so the list never filters by a title the dropdown can't show.
 */
export function departmentChange(
  lookups: Lookups | undefined,
  departmentId: string | undefined,
  jobTitleId: string | undefined,
): { department_id: string | undefined; job_title_id?: undefined } {
  const keepsTitle =
    !jobTitleId ||
    titlesForDepartment(lookups, departmentId).some(
      (title) => String(title.id) === jobTitleId,
    )
  return keepsTitle
    ? { department_id: departmentId }
    : { department_id: departmentId, job_title_id: undefined }
}
