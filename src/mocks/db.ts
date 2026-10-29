import type { Cart, CartItem, NFT, Order, Quote, Wallet } from '@/contracts'
import { INITIAL_COUPONS, type MockCoupon } from './fixtures/coupons'
import { INITIAL_NFTS } from './fixtures/nfts'
import { INITIAL_USERS, type MockUserAccount } from './fixtures/users'
import { INITIAL_WALLETS } from './fixtures/wallets'

export interface ScenarioConfig {
  latencyMs: number
  forceStatus: number | null
  simulateOffline: boolean
  forceOrderFail: boolean
  simulatePendingOrder?: boolean
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
    scenario: {
      latencyMs: 150,
      forceStatus: null,
      simulateOffline: false,
      forceOrderFail: false,
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
        // Garante compatibilidade de campos de carteira e favoritos de visitante
        if (!parsed.favorites) parsed.favorites = { guest: [] }
        if (!parsed.favorites.guest) parsed.favorites.guest = []
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

  // --- Favoritos (Suporta visitante e usuários logados) ---
  public getFavorites(userId?: string | null): string[] {
    const key = userId || 'guest'
    if (!this.state.favorites[key]) {
      this.state.favorites[key] = []
    }
    return this.state.favorites[key]
  }

  public toggleFavorite(userId: string | null | undefined, nftId: string): boolean {
    const key = userId || 'guest'
    const list = this.getFavorites(key)
    const exists = list.includes(nftId)
    if (exists) {
      this.state.favorites[key] = list.filter((id) => id !== nftId)
    } else {
      this.state.favorites[key] = [...list, nftId]
    }
    this.save()
    return !exists
  }

  // --- Carrinho & Cotação com precisão decimal em ETH ---
  public getCart(cartKey: string): Cart {
    if (!this.state.carts[cartKey]) {
      this.state.carts[cartKey] = { items: [], couponCode: null }
      this.save()
    }
    return this.state.carts[cartKey]
  }

  public setCart(cartKey: string, cart: Cart): void {
    this.state.carts[cartKey] = cart
    this.save()
  }

  public mergeGuestCartIntoUser(userId: string): void {
    const guestCart = this.getCart('guest')
    const userCart = this.getCart(userId)

    if (guestCart.items.length > 0) {
      const itemMap = new Map<string, CartItem>()
      userCart.items.forEach((item) => itemMap.set(`${item.nftId}-${item.edition}`, item))

      guestCart.items.forEach((guestItem) => {
        const key = `${guestItem.nftId}-${guestItem.edition}`
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!
          existing.quantity += guestItem.quantity
        } else {
          itemMap.set(key, guestItem)
        }
      })

      userCart.items = Array.from(itemMap.values())
      if (guestCart.couponCode && !userCart.couponCode) {
        userCart.couponCode = guestCart.couponCode
      }
      this.state.carts['guest'] = { items: [], couponCode: null }
      this.save()
    }
  }

  public mergeGuestFavoritesIntoUser(userId: string): void {
    if (!userId || userId === 'guest') return
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
    let subtotalNum = 0
    const PRECISION = 1_000_000

    for (const item of cart.items) {
      const nft = this.getNFTById(item.nftId)
      const currentPrice = nft ? parseFloat(nft.price) : parseFloat(item.unitPrice)
      subtotalNum += Math.round(currentPrice * PRECISION) * item.quantity
    }

    const subtotalETH = (subtotalNum / PRECISION).toFixed(4)
    let discountNum = 0
    let appliedCoupon = null

    if (cart.couponCode) {
      const coupon = this.state.coupons.find(
        (c) => c.code.toUpperCase() === cart.couponCode?.toUpperCase(),
      )
      if (coupon && coupon.active && new Date(coupon.expiresAt) > new Date()) {
        discountNum = Math.round((subtotalNum * coupon.discountPercentage) / 100)
        appliedCoupon = {
          code: coupon.code,
          discountPercentage: coupon.discountPercentage,
          discountAmountETH: (discountNum / PRECISION).toFixed(4),
          expiresAt: coupon.expiresAt,
        }
      }
    }

    const discountETH = (discountNum / PRECISION).toFixed(4)
    const networkFeeNum = cart.items.length > 0 ? Math.round(0.0025 * PRECISION) : 0
    const networkFeeETH = (networkFeeNum / PRECISION).toFixed(4)

    let quoteVersion = 1
    let isOutdated = false
    for (const item of cart.items) {
      const nft = this.getNFTById(item.nftId)
      if (nft) {
        if (nft.version) {
          quoteVersion = Math.max(quoteVersion, nft.version)
        }
        if (parseFloat(nft.price) !== parseFloat(item.unitPrice)) {
          isOutdated = true
        }
      }
    }

    const totalNum = Math.max(0, subtotalNum - discountNum + networkFeeNum)
    const totalETH = (totalNum / PRECISION).toFixed(4)

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

  // --- Pedidos & Idempotência ---
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
      order.transactionHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    }
    this.save()
    return order
  }
}

export const mockDb = new MockDatabase()
