import { Outlet } from "react-router"

import { TopLoadingBar } from "@/components/top-loading-bar"

/** Around every page, signed in or not: the loading bar, then the page. */
export function RootLayout() {
  return (
    <>
      <TopLoadingBar />
      <Outlet />
    </>
  )
}
