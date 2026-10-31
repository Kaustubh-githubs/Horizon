import { createBrowserRouter, Navigate } from "react-router"

import { AppShell } from "@/components/app-shell"
import { RootLayout } from "@/components/root-layout"
import { NotFound, RouteError } from "@/components/route-error"
import { RequireAuth } from "@/features/auth/require-auth"
import { DirectoryPage } from "@/features/employees/directory-page"

export const router = createBrowserRouter([
  {
    // The loading bar on every page, the sign-in page included.
    element: <RootLayout />,
    children: [
      {
        // Loaded on demand too: someone already signed in never needs it, nor its form library.
        path: "/login",
        lazy: async () => ({
          Component: (await import("@/features/auth/login-page")).LoginPage,
        }),
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
                  // Loaded when first opened, so the first visit downloads only what the
                  // directory (the landing page) needs. The current page stays on screen,
                  // with the top loading bar, until the next one is ready.
                  {
                    path: "/employees/new",
                    lazy: async () => ({
                      Component: (
                        await import("@/features/employees/new-employee-page")
                      ).NewEmployeePage,
                    }),
                  },
                  {
                    path: "/employees/:id",
                    lazy: async () => ({
                      Component: (
                        await import("@/features/employees/employee-page")
                      ).EmployeePage,
                    }),
                  },
                  {
                    path: "/employees/:id/edit",
                    lazy: async () => ({
                      Component: (
                        await import("@/features/employees/edit-employee-page")
                      ).EditEmployeePage,
                    }),
                  },
                  {
                    path: "/insights",
                    lazy: async () => ({
                      Component: (
                        await import("@/features/insights/insights-page")
                      ).InsightsPage,
                    }),
                  },
                  {
                    path: "/budgets",
                    lazy: async () => ({
                      Component: (
                        await import("@/features/budgets/budgets-page")
                      ).BudgetsPage,
                    }),
                  },
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
