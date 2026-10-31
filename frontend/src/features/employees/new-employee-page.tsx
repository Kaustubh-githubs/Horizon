import { useNavigate } from "react-router"
import { toast } from "sonner"

import { BackLink } from "@/components/back-link"
import { useCreateEmployee } from "@/features/employees/api"
import { useLookups } from "@/features/lookups/api"
import { EmployeeForm } from "@/features/employees/employee-form"
import { EmployeeLoadState } from "@/features/employees/employee-load-state"
import { ApiError } from "@/lib/api"
import { todayIso } from "@/lib/dates"

export function NewEmployeePage() {
  const lookups = useLookups()
  const createEmployee = useCreateEmployee()
  const navigate = useNavigate()

  const loadState = <EmployeeLoadState queries={[lookups]} shape="form" />
  if (!lookups.data) return loadState

  const error = createEmployee.error

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <BackLink to="/employees">Employees</BackLink>
      <h1 className="font-heading text-2xl font-semibold">Add employee</h1>

      <EmployeeForm
        mode="create"
        lookups={lookups.data}
        defaultValues={{
          full_name: "",
          email: "",
          hire_date: todayIso(),
          country_id: "",
          department_id: "",
          job_title_id: "",
          current_salary: "",
        }}
        serverErrors={error instanceof ApiError ? error.errors : undefined}
        formMessage={
          error && !(error instanceof ApiError) && "Couldn't save. Try again."
        }
        submitLabel="Add employee"
        isSubmitting={createEmployee.isPending}
        onCancel={() => void navigate("/employees")}
        onSubmit={(values) =>
          createEmployee.mutate(values, {
            onSuccess: (employee) => {
              toast.success(`${employee.full_name} added`)
              void navigate(`/employees/${employee.id}`)
            },
          })
        }
      />
    </section>
  )
}
