import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { socketHandler } from './socket'

export const worker = setupWorker(...handlers, socketHandler)

export async function enableMocking(): Promise<void> {
  await worker.start({
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
