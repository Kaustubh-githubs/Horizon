import { createBrowserRouter, Navigate } from "react-router"

import { AppShell } from "@/components/app-shell"
import { RootLayout } from "@/components/root-layout"
import { NotFound, RouteError } from "@/components/route-error"
import { LoginPage } from "@/features/auth/login-page"
import { BudgetsPage } from "@/features/budgets/budgets-page"
import { RequireAuth } from "@/features/auth/require-auth"
import { DirectoryPage } from "@/features/employees/directory-page"
import { EditEmployeePage } from "@/features/employees/edit-employee-page"
import { EmployeePage } from "@/features/employees/employee-page"
import { NewEmployeePage } from "@/features/employees/new-employee-page"

export const router = createBrowserRouter([
  {
    // The loading bar on every page, the sign-in page included.
    element: <RootLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
        errorElement: <RouteError fullPage />,
      },
      {
        element: <RequireAuth />,
        errorElement: <RouteError fullPage />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                // A page that crashes is replaced by the error below, inside the shell,
                // so the sidebar still works for getting somewhere else.
                errorElement: <RouteError />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/employees" replace />,
                  },
                  { path: "/employees", element: <DirectoryPage /> },
                  { path: "/employees/new", element: <NewEmployeePage /> },
                  { path: "/employees/:id", element: <EmployeePage /> },
                  {
                    path: "/employees/:id/edit",
                    element: <EditEmployeePage />,
                  },
                  {
                    // Loaded when first opened, so other pages don't download the
                    // charting library. The current page stays on screen (with the
                    // top loading bar) until it's ready.
                    path: "/insights",
                    lazy: async () => {
                      const { InsightsPage } =
                        await import("@/features/insights/insights-page")
                      return { Component: InsightsPage }
                    },
                  },
                  { path: "/budgets", element: <BudgetsPage /> },
                  { path: "*", element: <NotFound /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
