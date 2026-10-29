import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { toast } from 'sonner'
import type { Cart, NFT, NFTListResponse, Order } from '@/contracts'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import type { NFTUpdatedEventPayload, OrderUpdatedEventPayload } from '@/mocks/socket'
import { SOCKET_ORIGIN } from '@/mocks/socket'

interface SocketContextType {
  isConnected: boolean
  lastEvent: string | null
}

const SocketContext = createContext<SocketContextType>({
  isConnected: true,
  lastEvent: null,
})

let globalSocket: Socket | null = null
const highestNFTVersions = new Map<string, number>()
const highestOrderVersions = new Map<string, number>()

function getSocket() {
  if (!globalSocket && typeof window !== 'undefined') {
    globalSocket = io(SOCKET_ORIGIN, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__debugSocket = globalSocket
  }
  return globalSocket
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(() => {
    const s = getSocket()
    return !!s?.connected
  })
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__socketConnected = socket.connected
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__socketClient = socket
    }

    const onConnect = () => {
      console.log('[Client Socket] Connected to socket server!')
      setIsConnected(true)
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__socketConnected = true
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__socketClient = socket
      }
      // Reconciliação pós-reconexão com a API REST
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
    }

    const onConnectError = (err: Error) => {
      console.warn('[Client Socket] Connect error:', err.message)
    }

    const onDisconnect = (reason: string) => {
      console.log('[Client Socket] Disconnected:', reason)
      setIsConnected(false)
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__socketConnected = false
      }
    }

    // Handler do evento nft.updated
    const handleNFTUpdated = (payload: NFTUpdatedEventPayload) => {
      console.log('[Client Socket] Received nft.updated event:', payload)

      // 1. Verifica versão conhecida em memória
      const knownNFTVer = highestNFTVersions.get(payload.nftId) || 0

      // 2. Verifica versão nos detalhes em cache
      const detailQueries = queryClient.getQueriesData<NFT>({ queryKey: ['nfts', 'detail'] })
      let currentDetailVersion = 0
      for (const [, nft] of detailQueries) {
        if (nft && nft.id === payload.nftId && nft.version) {
          currentDetailVersion = Math.max(currentDetailVersion, nft.version)
        }
      }

      // 3. Verifica versão no carrinho
      const cartQueries = queryClient.getQueriesData<Cart>({ queryKey: ['cart'] })
      let currentCartVersion = 0
      for (const [, cartData] of cartQueries) {
        if (cartData && Array.isArray(cartData.items)) {
          const item = cartData.items.find((i) => i.nftId === payload.nftId)
          if (item?.nft?.version) {
            currentCartVersion = Math.max(currentCartVersion, item.nft.version)
          }
        }
      }

      // 4. Verifica versão nas listagens de catálogo em cache
      const listQueries = queryClient.getQueriesData<NFTListResponse>({
        queryKey: ['nfts', 'list'],
      })
      let currentListVersion = 0
      for (const [, listData] of listQueries) {
        if (listData && Array.isArray(listData.items)) {
          const item = listData.items.find((i) => i.id === payload.nftId)
          if (item?.version) {
            currentListVersion = Math.max(currentListVersion, item.version)
          }
        }
      }

      const currentVersion = Math.max(
        knownNFTVer,
        currentDetailVersion,
        currentCartVersion,
        currentListVersion,
      )

      if (payload.version < currentVersion) {
        console.log(
          `[Client Socket] Evento nft.updated descartado (versão ${payload.version} < atual ${currentVersion})`,
        )
        return
      }

      highestNFTVersions.set(payload.nftId, payload.version)
      setLastEvent(`nft.updated:${payload.nftId}:${payload.version}`)

      // 1. Atualiza detalhe do NFT no cache se existir
      queryClient.setQueryData<NFT>(queryKeys.nfts.detail(payload.nftId), (old) => {
        if (!old) return old
        if (payload.version < old.version) return old
        return {
          ...old,
          price: payload.price,
          availableEditions: payload.availableEditions,
          version: payload.version,
        }
      })

      // 2. Atualiza nas listas de catálogo no cache
      queryClient.setQueriesData<NFTListResponse>({ queryKey: ['nfts', 'list'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === payload.nftId
              ? payload.version < item.version
                ? item
                : {
                    ...item,
                    price: payload.price,
                    availableEditions: payload.availableEditions,
                    version: payload.version,
                  }
              : item,
          ),
        }
      })

      // 3. Atualiza nos favoritos se existir
      queryClient.setQueriesData<NFT[]>({ queryKey: ['favorites', 'details'] }, (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((item) =>
          item.id === payload.nftId
            ? payload.version < item.version
              ? item
              : {
                  ...item,
                  price: payload.price,
                  availableEditions: payload.availableEditions,
                  version: payload.version,
                }
            : item,
        )
      })

      // 4. Atualiza preço/disponibilidade no carrinho se o item estiver lá
      queryClient.setQueriesData<Cart>({ queryKey: ['cart'] }, (oldCart) => {
        if (!oldCart || !Array.isArray(oldCart.items)) return oldCart
        const hasItem = oldCart.items.some((i) => i.nftId === payload.nftId)
        if (!hasItem) return oldCart

        const currentItem = oldCart.items.find((i) => i.nftId === payload.nftId)
        if (currentItem && currentItem.nft?.version && payload.version < currentItem.nft.version) {
          return oldCart
        }

        toast.warning(`Preço atualizado em tempo real para ${payload.price} ETH`)

        return {
          ...oldCart,
          items: oldCart.items.map((item) =>
            item.nftId === payload.nftId
              ? payload.version < (item.nft?.version || 0)
                ? item
                : {
                    ...item,
                    nft: {
                      ...item.nft,
                      price: payload.price,
                      availableEditions: payload.availableEditions,
                      version: payload.version,
                    },
                  }
              : item,
          ),
        }
      })

      // Invalida cotação do carrinho para forçar recálculo
      void queryClient.invalidateQueries({ queryKey: ['cart', 'quote'] })
    }

    // Handler do evento order.updated
    const handleOrderUpdated = (payload: OrderUpdatedEventPayload) => {
      const knownOrderVer = highestOrderVersions.get(payload.orderId) || 0
      if (payload.version < knownOrderVer) {
        console.log(
          `[Client Socket] Evento order.updated descartado (versão ${payload.version} < conhecida ${knownOrderVer})`,
        )
        return
      }

      const existingOrder = queryClient.getQueryData<Order>(
        queryKeys.orders.detail(payload.orderId),
      )
      // Pedidos confirmados ou recusados são terminais (README seção 7)
      if (
        existingOrder &&
        (existingOrder.status === 'confirmed' || existingOrder.status === 'rejected')
      ) {
        if (payload.status === 'pending') {
          console.log(
            `[Client Socket] Descartando tentativa de regressão de pedido terminal (${existingOrder.status} -> pending)`,
          )
          return
        }
      }

      highestOrderVersions.set(payload.orderId, payload.version)
      setLastEvent(`order.updated:${payload.orderId}`)

      queryClient.setQueryData<Order>(queryKeys.orders.detail(payload.orderId), (old) => {
        if (!old) return old
        if (payload.version < old.version) return old
        if (
          (old.status === 'confirmed' || old.status === 'rejected') &&
          payload.status === 'pending'
        ) {
          return old
        }
        return {
          ...old,
          status: payload.status,
          transactionHash: payload.transactionHash || old.transactionHash,
          rejectionReason: payload.rejectionReason || old.rejectionReason,
          version: payload.version,
        }
      })

      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    }

    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)
    socket.on('disconnect', onDisconnect)
    socket.on('nft.updated', handleNFTUpdated)
    socket.on('order.updated', handleOrderUpdated)

    return () => {
      socket.off('connect', onConnect)
      socket.off('connect_error', onConnectError)
      socket.off('disconnect', onDisconnect)
      socket.off('nft.updated', handleNFTUpdated)
      socket.off('order.updated', handleOrderUpdated)
    }
  }, [])

  return (
    <SocketContext.Provider value={{ isConnected, lastEvent }}>{children}</SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
