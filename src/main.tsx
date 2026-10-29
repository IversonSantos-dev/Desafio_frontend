import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { queryClient } from './lib/query-client'
import { enableMocking } from './mocks/browser'
import type { routeTree } from './routeTree.gen'
import './index.css'

type AppRouter = ReturnType<typeof createRouter<typeof routeTree>>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}

async function start() {
  // Inicializa o MSW na camada de rede antes de carregar as rotas e componentes
  await enableMocking()

  const { routeTree: dynamicRouteTree } = await import('./routeTree.gen')

  const router = createRouter({
    routeTree: dynamicRouteTree,
    defaultPreload: 'intent',
    context: {
      queryClient,
    },
  })

  const rootElement = document.getElementById('root')!
  if (!rootElement.innerHTML) {
    const root = createRoot(rootElement)
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    )
  }
}

void start()
