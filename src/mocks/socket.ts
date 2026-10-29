import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NFT, Order } from '@/contracts'
import { mockDb } from './db'

export const SOCKET_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'

const wsServer = ws.link(/.*/)

// Armazena conexões io ativas para broadcast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeIoClients = new Set<any>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const socketHandler = wsServer.addEventListener('connection', (connection: any) => {
  console.log('[MSW WS] Server received connection!', connection?.client?.url?.href)
  // Passa server como objeto vazio para forçar toSocketIo a enviar o handshake Engine.IO mock
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const io = toSocketIo({ ...connection, server: {} } as any)
  activeIoClients.add(io.client)

  connection.client?.addEventListener?.('close', () => {
    console.log('[MSW WS] Client closed connection')
    activeIoClients.delete(io.client)
  })
})

export interface NFTUpdatedEventPayload {
  nftId: string
  price: string
  availableEditions: number
  version: number
  updatedAt: string
}

export interface OrderUpdatedEventPayload {
  orderId: string
  userId?: string
  status: Order['status']
  transactionHash?: string
  rejectionReason?: string
  version: number
  updatedAt: string
}

export function broadcastNFTUpdated(
  nftId: string,
  updates: { price?: string; availableEditions?: number },
): NFT | null {
  const updatedNFT = mockDb.updateNFT(nftId, updates)
  if (!updatedNFT) return null

  const payload: NFTUpdatedEventPayload = {
    nftId: updatedNFT.id,
    price: updatedNFT.price,
    availableEditions: updatedNFT.availableEditions,
    version: updatedNFT.version,
    updatedAt: new Date().toISOString(),
  }

  console.log('[MSW WS] broadcastNFTUpdated, active clients count:', activeIoClients.size)
  activeIoClients.forEach((client) => {
    try {
      console.log('[MSW WS] Emitting nft.updated to client', payload)
      client.emit('nft.updated', payload)
    } catch (err) {
      console.error('[MSW WS] Error emitting to client:', err)
    }
  })

  return updatedNFT
}

export function broadcastOrderUpdated(
  orderId: string,
  status: Order['status'],
  reason?: string,
): Order | null {
  const updatedOrder = mockDb.updateOrderStatus(orderId, status, reason)
  if (!updatedOrder) return null

  const payload: OrderUpdatedEventPayload = {
    orderId: updatedOrder.id,
    userId: updatedOrder.userId,
    status: updatedOrder.status,
    transactionHash: updatedOrder.transactionHash,
    rejectionReason: updatedOrder.rejectionReason,
    version: updatedOrder.version,
    updatedAt: updatedOrder.updatedAt,
  }

  activeIoClients.forEach((client) => {
    try {
      client.emit('order.updated', payload)
    } catch {
      // Ignora desconexões
    }
  })

  return updatedOrder
}

export function emitRawSocketEvent(event: string, payload: unknown) {
  activeIoClients.forEach((client) => {
    try {
      client.emit(event, payload)
    } catch {
      // Ignora desconexões
    }
  })
}
