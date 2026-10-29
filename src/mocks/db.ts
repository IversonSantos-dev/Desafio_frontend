import type { Cart, NFT, Order, Quote, Wallet } from '@/contracts'
import {
  decimalAdd,
  decimalEquals,
  decimalPercentage,
  decimalSubtract,
  multiplyUnitPrice,
} from '@/lib/decimal'
import { INITIAL_COUPONS, type MockCoupon } from './fixtures/coupons'
import { INITIAL_NFTS } from './fixtures/nfts'
import { INITIAL_USERS, mockHashPassword, type MockUserAccount } from './fixtures/users'
import { INITIAL_WALLETS } from './fixtures/wallets'

export interface ScenarioConfig {
  latencyMs: number
  forceStatus: number | null
  simulateOffline: boolean
  forceOrderFail: boolean
  simulatePendingOrder?: boolean
  sessionExpired?: boolean
}

export interface MockDatabaseState {
  nfts: NFT[]
  users: MockUserAccount[]
  wallets: Wallet[]
  coupons: MockCoupon[]
  favorites: Record<string, string[]> // userId -> nftIds[]
  carts: Record<string, Cart> // cartKey (userId or 'guest') -> Cart
  orders: Order[]
  idempotencyRecords: Record<string, { orderId: string; payloadHash: string }>
  reservations: Record<string, { nftId: string; edition: number; quantity: number }[]>
  scenario: ScenarioConfig
}

const STORAGE_KEY = 'nft_market_mock_db_v3'

function getInitialState(): MockDatabaseState {
  return {
    nfts: JSON.parse(JSON.stringify(INITIAL_NFTS)),
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    wallets: JSON.parse(JSON.stringify(INITIAL_WALLETS)),
    coupons: JSON.parse(JSON.stringify(INITIAL_COUPONS)),
    favorites: {
      guest: [],
      user_1: ['nft_1', 'nft_4'],
      user_2: ['nft_2'],
    },
    carts: {
      guest: { items: [], couponCode: null },
      user_1: { items: [], couponCode: null },
      user_2: { items: [], couponCode: null },
    },
    orders: [],
    idempotencyRecords: {},
    reservations: {},
    scenario: {
      latencyMs: 150,
      forceStatus: null,
      simulateOffline: false,
      forceOrderFail: false,
      simulatePendingOrder: false,
      sessionExpired: false,
    },
  }
}

class MockDatabase {
  private state: MockDatabaseState

  constructor() {
    this.state = this.load()
  }

  private load(): MockDatabaseState {
    try {
      localStorage.removeItem('nft_market_mock_db_v1')
      localStorage.removeItem('nft_market_mock_db_v2')
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.nfts) {
          const freshMap = new Map(INITIAL_NFTS.map((n) => [n.id, n.image]))
          parsed.nfts = parsed.nfts.map((n: NFT) => ({
            ...n,
            image: freshMap.get(n.id) || n.image,
          }))
        }
        // Garante compatibilidade de hashes seguros simulados
        if (parsed.users) {
          parsed.users = parsed.users.map((u: MockUserAccount) => {
            if (!u.passwordHash || !u.passwordHash.startsWith('mock_argon2id$')) {
              return { ...u, passwordHash: mockHashPassword(u.passwordHash || 'password123') }
            }
            return u
          })
        }
        // Garante compatibilidade de campos de carteira e favoritos de visitante
        if (!parsed.favorites) parsed.favorites = { guest: [] }
        if (!parsed.favorites.guest) parsed.favorites.guest = []
        if (!parsed.reservations) parsed.reservations = {}
        if (parsed.wallets) {
          parsed.wallets = parsed.wallets.map((w: Partial<Wallet>, idx: number) => ({
            ...w,
            label: w.label || `Carteira #${idx + 1}`,
            profileName: w.profileName || 'Colecionador',
            referralCode: w.referralCode || 'NFT-2026',
            email: w.email || 'colecionador@nftmarket.dev',
            ensName: w.ensName || 'colecionador.eth',
          }))
        }
        return parsed
      }
    } catch {
      // Ignora erro em ambientes sem localStorage
    }
    return getInitialState()
  }

  public save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // Ignora
    }
  }

  public reset(): void {
    this.state = getInitialState()
    this.save()
  }

  public getState(): MockDatabaseState {
    return this.state
  }

  // --- Helpers de Cenário ---
  public getScenario(): ScenarioConfig {
    return this.state.scenario
  }

  public updateScenario(partial: Partial<ScenarioConfig>): void {
    this.state.scenario = { ...this.state.scenario, ...partial }
    this.save()
  }

  // --- NFTs ---
  public getNFTs(): NFT[] {
    return this.state.nfts
  }

  public getNFTById(id: string): NFT | undefined {
    return this.state.nfts.find((n) => n.id === id)
  }

  public updateNFT(id: string, updates: Partial<NFT>): NFT | null {
    const idx = this.state.nfts.findIndex((n) => n.id === id)
    if (idx === -1) return null
    const updated = {
      ...this.state.nfts[idx],
      ...updates,
      version: (this.state.nfts[idx].version || 1) + 1,
    }
    this.state.nfts[idx] = updated
    this.save()
    return updated
  }

  // --- Carrinho ---
  public getCart(userId: string): Cart {
    if (!this.state.carts[userId]) {
      this.state.carts[userId] = { items: [], couponCode: null }
      this.save()
    }
    return this.state.carts[userId]
  }

  public setCart(userId: string, cart: Cart): void {
    this.state.carts[userId] = cart
    this.save()
  }

  public mergeGuestCartIntoUser(userId: string): void {
    const guestCart = this.getCart('guest')
    if (guestCart.items.length === 0) return

    const userCart = this.getCart(userId)
    for (const gItem of guestCart.items) {
      const existing = userCart.items.find(
        (i) => i.nftId === gItem.nftId && i.edition === gItem.edition,
      )
      if (existing) {
        existing.quantity += gItem.quantity
      } else {
        userCart.items.push({ ...gItem })
      }
    }
    this.state.carts['guest'] = { items: [], couponCode: null }
    this.setCart(userId, userCart)
  }

  // --- Favoritos ---
  public getFavorites(userId: string): string[] {
    return this.state.favorites[userId] || []
  }

  public toggleFavorite(userId: string, nftId: string): boolean {
    if (!this.state.favorites[userId]) {
      this.state.favorites[userId] = []
    }
    const favs = this.state.favorites[userId]
    const idx = favs.indexOf(nftId)
    let isFav = false
    if (idx > -1) {
      favs.splice(idx, 1)
      isFav = false
    } else {
      favs.push(nftId)
      isFav = true
    }
    this.save()
    return isFav
  }

  public mergeGuestFavoritesIntoUser(userId: string): void {
    const guestFavs = this.getFavorites('guest')
    if (guestFavs.length > 0) {
      const userFavs = new Set(this.getFavorites(userId))
      guestFavs.forEach((id) => userFavs.add(id))
      this.state.favorites[userId] = Array.from(userFavs)
      this.state.favorites['guest'] = []
      this.save()
    }
  }

  public calculateQuote(cartKey: string): Quote {
    const cart = this.getCart(cartKey)
    let subtotalETH = '0.0000'

    for (const item of cart.items) {
      const nft = this.getNFTById(item.nftId)
      const currentPrice = nft ? nft.price : item.unitPrice
      const itemTotal = multiplyUnitPrice(currentPrice, item.quantity)
      subtotalETH = decimalAdd(subtotalETH, itemTotal)
    }

    let discountETH = '0.0000'
    let appliedCoupon = null

    if (cart.couponCode) {
      const coupon = this.state.coupons.find(
        (c) => c.code.toUpperCase() === cart.couponCode?.toUpperCase(),
      )
      if (coupon && coupon.active && new Date(coupon.expiresAt) > new Date()) {
        discountETH = decimalPercentage(subtotalETH, coupon.discountPercentage)
        appliedCoupon = {
          code: coupon.code,
          discountPercentage: coupon.discountPercentage,
          discountAmountETH: discountETH,
          expiresAt: coupon.expiresAt,
        }
      }
    }

    const networkFeeETH = cart.items.length > 0 ? '0.0025' : '0.0000'
    const totalWithoutFee = decimalSubtract(subtotalETH, discountETH)
    const totalETH = decimalAdd(totalWithoutFee, networkFeeETH)

    let quoteVersion = 1
    let isOutdated = false
    for (const item of cart.items) {
      const nft = this.getNFTById(item.nftId)
      if (nft) {
        if (nft.version) {
          quoteVersion = Math.max(quoteVersion, nft.version)
        }
        if (!decimalEquals(nft.price, item.unitPrice)) {
          isOutdated = true
        }
      }
    }

    return {
      subtotalETH,
      discountETH,
      networkFeeETH,
      totalETH,
      coupon: appliedCoupon,
      quoteTimestamp: new Date().toISOString(),
      quoteVersion,
      isOutdated,
    }
  }

  // --- Pedidos & Idempotência & Reservas ---
  public getOrder(orderId: string): Order | undefined {
    return this.state.orders.find((o) => o.id === orderId)
  }

  public getOrderByIdempotencyKey(key: string): Order | undefined {
    const record = this.state.idempotencyRecords[key]
    if (!record) return undefined
    return this.getOrder(record.orderId)
  }

  public saveOrder(order: Order, idempotencyKey: string, payloadHash: string): void {
    this.state.orders.push(order)
    this.state.idempotencyRecords[idempotencyKey] = {
      orderId: order.id,
      payloadHash,
    }
    this.save()
  }

  public reserveStock(orderId: string, items: { nftId: string; edition: number; quantity: number }[]): void {
    this.state.reservations[orderId] = items.map((i) => ({ ...i }))
    // Reserva temporária de estoque: debita para impedir concorrência
    items.forEach((item) => {
      const nft = this.getNFTById(item.nftId)
      if (nft) {
        this.updateNFT(nft.id, {
          availableEditions: Math.max(0, nft.availableEditions - item.quantity),
        })
      }
    })
    this.save()
  }

  public commitOrder(orderId: string, userId: string): void {
    const reservedItems = this.state.reservations[orderId]
    if (reservedItems) {
      // O estoque já foi reservado na criação do pedido. Remove apenas as quantidades compradas do carrinho:
      const cart = this.getCart(userId)
      reservedItems.forEach((item) => {
        const cartItemIdx = cart.items.findIndex(
          (ci) => ci.nftId === item.nftId && ci.edition === item.edition,
        )
        if (cartItemIdx > -1) {
          const currentQty = cart.items[cartItemIdx].quantity
          if (currentQty <= item.quantity) {
            cart.items.splice(cartItemIdx, 1)
          } else {
            cart.items[cartItemIdx].quantity = currentQty - item.quantity
          }
        }
      })
      if (cart.items.length === 0) cart.couponCode = null
      this.setCart(userId, cart)

      delete this.state.reservations[orderId]
      this.save()
    }
  }

  public rollbackOrderReservation(orderId: string): void {
    const reservedItems = this.state.reservations[orderId]
    if (reservedItems) {
      // Devolve o estoque reservado de volta ao catálogo
      reservedItems.forEach((item) => {
        const nft = this.getNFTById(item.nftId)
        if (nft) {
          this.updateNFT(nft.id, {
            availableEditions: nft.availableEditions + item.quantity,
          })
        }
      })
      delete this.state.reservations[orderId]
      this.save()
    }
  }

  public updateOrderStatus(
    orderId: string,
    status: Order['status'],
    rejectionReason?: string,
  ): Order | null {
    const order = this.getOrder(orderId)
    if (!order) return null
    order.status = status
    order.updatedAt = new Date().toISOString()
    order.version = (order.version || 1) + 1
    if (rejectionReason) order.rejectionReason = rejectionReason
    if (status === 'confirmed') {
      if (!order.transactionHash) {
        order.transactionHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
      }
      this.commitOrder(order.id, order.userId)
    } else if (status === 'rejected') {
      this.rollbackOrderReservation(order.id)
    }
    this.save()
    return order
  }
}

export const mockDb = new MockDatabase()
