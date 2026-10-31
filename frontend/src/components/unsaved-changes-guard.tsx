import { useEffect } from "react"
import { useBlocker } from "react-router"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/**
 * While `when` is true, leaving the page asks first: Back, Cancel or a sidebar link open a
 * "Discard your changes?" dialog, and reloading or closing the tab gets the browser's own prompt.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [when])

  return (
    <AlertDialog
      open={blocker.state === "blocked"}
      // Escape, the overlay and "Keep editing" all stay on the page.
      onOpenChange={(open) => {
        if (!open) blocker.reset?.()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ve changed this form but haven&apos;t saved it. Leaving now
            loses those changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          {/* A plain button, not AlertDialogAction: closing the dialog would also reset the
              blocker. Proceeding moves it out of "blocked", which closes the dialog. */}
          <Button variant="destructive" onClick={() => blocker.proceed?.()}>
            Discard changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
