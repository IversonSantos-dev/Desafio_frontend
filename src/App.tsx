import { Sparkles } from 'lucide-react'

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-lg ring-1 ring-primary/40">
        <Sparkles className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        NFT Marketplace
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Scaffold & Tooling configurados com sucesso. Pronto para a Etapa 2 (TanStack Router).
      </p>
    </main>
  )
}

export default App
