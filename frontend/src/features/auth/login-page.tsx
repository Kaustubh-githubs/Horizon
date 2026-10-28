import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Navigate, useLocation, useNavigate } from "react-router"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCurrentUser, useLogin } from "@/features/auth/session"
import { ApiError } from "@/lib/api"

const loginSchema = z.object({
  email_address: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { data: user } = useCurrentUser()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo =
    (location.state as { from?: string } | null)?.from ?? "/employees"

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (user) return <Navigate to={returnTo} replace />

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => void navigate(returnTo, { replace: true }),
    }),
  )

  const serverError =
    login.error instanceof ApiError
      ? login.error.message
      : login.error && "Something went wrong. Try again."

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Horizon</CardTitle>
          <CardDescription>Sign in to manage salaries at ACME.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => void onSubmit(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email_address">Email</Label>
              <Input
                id="email_address"
                type="email"
                autoComplete="username"
                autoFocus
                aria-invalid={errors.email_address ? true : undefined}
                {...register("email_address")}
              />
              {errors.email_address && (
                <p className="text-sm text-destructive">
                  {errors.email_address.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
