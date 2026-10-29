import { createRootRoute, Link, Outlet, ScrollRestoration } from '@tanstack/react-router'
import { AlertCircle, FileQuestion } from 'lucide-react'
import { Toaster } from 'sonner'
import { ScenarioToolbar } from '@/components/dev/ScenarioToolbar'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { SocketProvider } from '@/lib/socket-context'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
})

function RootComponent() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
          <Header />
          <main className="flex-1 pb-24 md:pb-0">
            <Outlet />
          </main>
          <Footer />
          <MobileBottomNav />
          <ScenarioToolbar />
          <Toaster position="bottom-right" richColors theme="dark" />
          <ScrollRestoration />
        </div>
      </SocketProvider>
    </AuthProvider>
  )
}

function NotFoundComponent() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Página Não Encontrada (404)
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        A rota solicitada não existe ou foi removida.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform active:scale-95"
      >
        Voltar ao Catálogo
      </Link>
    </div>
  )
}

function ErrorComponent({ error }: { error: unknown }) {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Ocorreu um erro inesperado
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error instanceof Error ? error.message : 'Falha ao renderizar componente.'}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-transform active:scale-95"
      >
        Recarregar Início
      </Link>
    </div>
  )
}
