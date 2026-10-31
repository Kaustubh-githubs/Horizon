import { describe, expect, it } from "vitest"

import type { Lookups } from "@/features/lookups/api"
import {
  departmentChange,
  titlesForDepartment,
} from "@/features/lookups/job-titles"

const lookups: Lookups = {
  countries: [],
  departments: [
    { id: 1, name: "Engineering", job_title_ids: [10, 11] },
    { id: 2, name: "Sales", job_title_ids: [20] },
  ],
  job_titles: [
    { id: 10, name: "Software Engineer" },
    { id: 11, name: "QA Engineer" },
    { id: 20, name: "Account Executive" },
  ],
}

// The Job title filter follows the Department filter (ADR 0019).
describe("titlesForDepartment", () => {
  it("offers only the titles held in the picked department", () => {
    expect(titlesForDepartment(lookups, "1").map((t) => t.name)).toEqual([
      "Software Engineer",
      "QA Engineer",
    ])
  })

  it("offers every title when no department is picked", () => {
    expect(titlesForDepartment(lookups, undefined)).toHaveLength(3)
  })
})

describe("departmentChange", () => {
  it("keeps a picked title the new department holds", () => {
    expect(departmentChange(lookups, "1", "10")).toEqual({ department_id: "1" })
  })

  it("drops a picked title the new department doesn't hold", () => {
    expect(departmentChange(lookups, "2", "10")).toEqual({
      department_id: "2",
      job_title_id: undefined,
    })
  })
})
