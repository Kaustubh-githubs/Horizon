import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="font-heading text-3xl font-semibold">Horizon</h1>
      <p className="text-muted-foreground">Salary management for ACME HR.</p>
      <Button>Get started</Button>
    </main>
  )
}

export default App
