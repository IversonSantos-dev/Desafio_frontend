import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { socketHandler } from './socket'

export const worker = setupWorker(...handlers, socketHandler)

/**
 * Inicializa o interceptor MSW no navegador.
 * Permite desativar via configuração por variável de ambiente (VITE_ENABLE_MSW=false)
 * ou flag em tempo de execução (window.__DISABLE_MSW__), mantendo ativado por padrão
 * inclusive no build de demonstração.
 */
export async function enableMocking(): Promise<void> {
  const isMswDisabled =
    import.meta.env.VITE_ENABLE_MSW === 'false' ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (typeof window !== 'undefined' && Boolean((window as any).__DISABLE_MSW__))

  if (isMswDisabled) {
    console.info('[MSW] Interceptação de mocks desativada por configuração.')
    return
  }

  await worker.start({
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
