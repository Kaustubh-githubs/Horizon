import { createBrowserRouter, Navigate } from "react-router"

import { AppShell } from "@/components/app-shell"
import { LoginPage } from "@/features/auth/login-page"
import { RequireAuth } from "@/features/auth/require-auth"
import { DirectoryPage } from "@/features/employees/directory-page"
import { PlaceholderPage } from "@/pages/placeholder-page"

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/employees" replace /> },
          { path: "/employees", element: <DirectoryPage /> },
          {
            path: "/insights",
            element: (
              <PlaceholderPage
                title="Insights"
                description="Pay insights arrive in a later slice."
              />
            ),
          },
          {
            path: "*",
            element: (
              <PlaceholderPage
                title="Page not found"
                description="Check the address."
              />
            ),
          },
        ],
      },
    ],
  },
])
