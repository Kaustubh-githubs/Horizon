import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { Button } from "@/components/ui/button"
import {
  useEmployee,
  useUpdateEmployee,
  type Employee,
} from "@/features/employees/api"
import { useLookups, type Lookups } from "@/features/lookups/api"
import { EmployeeForm } from "@/features/employees/employee-form"
import type { EmployeeFormValues } from "@/features/employees/employee-form-schema"
import { EmployeeLoadState } from "@/features/employees/employee-load-state"
import { ApiError } from "@/lib/api"

const toFormValues = (employee: Employee): EmployeeFormValues => ({
  full_name: employee.full_name,
  email: employee.email,
  hire_date: employee.hire_date,
  country_id: String(employee.country.id),
  department_id: String(employee.department.id),
  job_title_id: String(employee.job_title.id),
  current_salary: employee.current_salary,
})

export function EditEmployeePage() {
  const { id = "" } = useParams()
  const employeeQuery = useEmployee(id)
  const lookups = useLookups()
  // Bumped by "Load their changes", to start the form again from the latest version.
  const [formVersion, setFormVersion] = useState(0)
  // The form keeps the version it starts from, so it must not start from an old cached copy
  // (ADR 0017). Until the employee has been fetched since this page opened, the cached copy
  // (from the profile) is shown but can't be edited; the form then starts again from the
  // fresh one. With nothing cached, a skeleton.
  const [openedAt] = useState(Date.now)
  const fresh = employeeQuery.dataUpdatedAt >= openedAt

  // If loading the latest version fails, that's an error even with a cached copy: editing it
  // would only conflict. A background refetch failing later leaves the form (and typing) alone.
  const loadState = (
    <EmployeeLoadState
      queries={[employeeQuery, lookups]}
      ready={Boolean(employeeQuery.data)}
      shape="form"
    />
  )
  if (!employeeQuery.data || !lookups.data || (!fresh && employeeQuery.isError))
    return loadState

  const employee = employeeQuery.data

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Employees", to: "/employees" },
          { label: employee.full_name, to: `/employees/${employee.id}` },
          { label: "Edit" },
        ]}
      />
      <h1 className="font-heading text-2xl font-semibold">Edit employee</h1>

      {employee.status === "terminated" ? (
        <p className="text-muted-foreground">
          {employee.full_name} is a former employee, so their record can&apos;t
          be changed.
        </p>
      ) : (
        <EditForm
          key={`${formVersion}-${fresh}`}
          employee={employee}
          checking={!fresh}
          lookups={lookups.data}
          onReload={() =>
            void employeeQuery.refetch().then((result) => {
              // refetch resolves even when the request fails; restarting from the old copy
              // would only lead to the same conflict again.
              if (result.isError)
                toast.error("Couldn't load the latest version. Try again.")
              else setFormVersion((version) => version + 1)
            })
          }
        />
      )}
    </section>
  )
}

function EditForm({
  employee,
  checking,
  lookups,
  onReload,
}: {
  employee: Employee
  /** Still loading the latest version: show this copy, not editable. */
  checking: boolean
  lookups: Lookups
  onReload: () => void
}) {
  // The version the form opened with. A background refetch (e.g. on window focus) must not
  // swap in someone else's edits under the user's typing: the save sends this lock_version,
  // and a conflict is reported instead (ADR 0017).
  const [loaded] = useState(employee)
  const updateEmployee = useUpdateEmployee(loaded.id)
  const navigate = useNavigate()
  const error = updateEmployee.error
  const conflict = error instanceof ApiError && error.status === 409

  return (
    <EmployeeForm
      mode="edit"
      lookups={lookups}
      defaultValues={toFormValues(loaded)}
      serverErrors={
        error instanceof ApiError && !conflict ? error.errors : undefined
      }
      formMessage={
        conflict ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Someone else changed this employee while you were editing. Load
              their changes, then make yours again.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReload}
            >
              Load their changes
            </Button>
          </div>
        ) : (
          error && !(error instanceof ApiError) && "Couldn't save. Try again."
        )
      }
      submitLabel="Save changes"
      isSubmitting={updateEmployee.isPending}
      disabled={checking}
      onCancel={() => void navigate(`/employees/${loaded.id}`)}
      onSubmit={(values) =>
        updateEmployee.mutate(
          {
            full_name: values.full_name,
            email: values.email,
            department_id: values.department_id,
            job_title_id: values.job_title_id,
            lock_version: loaded.lock_version,
          },
          {
            onSuccess: (saved) => {
              toast.success("Changes saved")
              void navigate(`/employees/${saved.id}`)
            },
          },
        )
      }
    />
  )
}
