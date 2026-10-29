import { delay, http, HttpResponse } from 'msw'
import {
  CreateOrderInputSchema,
  CreateWalletInputSchema,
  LoginCredentialsSchema,
  RegisterCredentialsSchema,
  UpdateWalletInputSchema,
  type CartItem,
  type User,
} from '@/contracts'
import { decimalAdd, decimalCompare } from '@/lib/decimal'
import { mockDb } from './db'
import { mockHashPassword, verifyMockPassword, type MockUserAccount } from './fixtures/users'
import { broadcastNFTUpdated, broadcastOrderUpdated, emitRawSocketEvent } from './socket'

interface SessionValidation {
  userId: string | null
  user: MockUserAccount | null
  errorResponse: Response | null
}

// Helper para validar token e expiração de sessão em requisições protegidas
function validateSession(request: Request): SessionValidation {
  const scenario = mockDb.getScenario()
  if (scenario.sessionExpired) {
    return {
      userId: null,
      user: null,
      errorResponse: HttpResponse.json(
        { message: 'Sessão expirada. Faça login novamente.', code: 'SESSION_EXPIRED' },
        { status: 401 },
      ),
    }
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      userId: null,
      user: null,
      errorResponse: HttpResponse.json(
        { message: 'Autenticação necessária.', code: 'UNAUTHORIZED' },
        { status: 401 },
      ),
    }
  }

  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return {
      userId: null,
      user: null,
      errorResponse: HttpResponse.json(
        { message: 'Token de autenticação não fornecido.', code: 'UNAUTHORIZED' },
        { status: 401 },
      ),
    }
  }

  // Token format: "mock-token-{userId}-{issuedAt}-{expiresAt}" ou "mock-token-{userId}-{timestamp}"
  const parts = token.split('-')
  if (parts.length >= 3 && parts[0] === 'mock' && parts[1] === 'token') {
    const userId = parts[2]
    if (parts.length >= 5) {
      const expiresAt = Number(parts[4])
      if (!isNaN(expiresAt) && Date.now() > expiresAt) {
        return {
          userId: null,
          user: null,
          errorResponse: HttpResponse.json(
            { message: 'Sessão expirada. Faça login novamente.', code: 'SESSION_EXPIRED' },
            { status: 401 },
          ),
        }
      }
    }

    const user = mockDb.getState().users.find((u) => u.id === userId) || null
    if (!user) {
      return {
        userId: null,
        user: null,
        errorResponse: HttpResponse.json(
          { message: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' },
          { status: 401 },
        ),
      }
    }

    return {
      userId,
      user,
      errorResponse: null,
    }
  }

  return {
    userId: null,
    user: null,
    errorResponse: HttpResponse.json(
      { message: 'Token de autenticação inválido.', code: 'INVALID_TOKEN' },
      { status: 401 },
    ),
  }
}

function getOptionalUserId(request: Request): string {
  const session = validateSession(request)
  return session.userId || 'guest'
}

// Middleware de cenário MSW (latência e injeção de falhas)
async function applyScenario(): Promise<Response | null> {
  const scenario = mockDb.getScenario()

  if (scenario.simulateOffline) {
    return HttpResponse.error()
  }

  if (scenario.latencyMs > 0) {
    await delay(scenario.latencyMs)
  }

  if (scenario.forceStatus) {
    return HttpResponse.json(
      { message: `Simulação de erro HTTP ${scenario.forceStatus}` },
      { status: scenario.forceStatus },
    )
  }

  return null
}

export const handlers = [
  // --- AUTH / SESSÃO ---
  http.post('/api/auth/login', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const rawBody = await request.json().catch(() => null)
    const parseResult = LoginCredentialsSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return HttpResponse.json(
        { message: 'Credenciais inválidas.', errors: parseResult.error.flatten() },
        { status: 400 },
      )
    }

    const body = parseResult.data
    const users = mockDb.getState().users
    const user = users.find((u) => u.email.toLowerCase() === body.email.toLowerCase())

    if (!user || !verifyMockPassword(body.password, user.passwordHash)) {
      return HttpResponse.json(
        { message: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 },
      )
    }

    const issuedAt = Date.now()
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000
    const token = `mock-token-${user.id}-${issuedAt}-${expiresAt}`
    const expiresAtIso = new Date(expiresAt).toISOString()

    // Ao autenticar, mescla carrinho e favoritos de visitante se houver
    mockDb.mergeGuestCartIntoUser(user.id)
    mockDb.mergeGuestFavoritesIntoUser(user.id)

    return HttpResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      token,
      expiresAt: expiresAtIso,
    })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const rawBody = await request.json().catch(() => null)
    const parseResult = RegisterCredentialsSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return HttpResponse.json(
        { message: 'Dados de cadastro inválidos.', errors: parseResult.error.flatten() },
        { status: 400 },
      )
    }

    const body = parseResult.data
    const users = mockDb.getState().users
    const existing = users.find((u) => u.email.toLowerCase() === body.email.toLowerCase())

    if (existing) {
      return HttpResponse.json(
        { message: 'Este e-mail já está em uso por outro colecionador.' },
        { status: 409 },
      )
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: body.name,
      email: body.email,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      bio: 'Colecionador recém-chegado ao mercado.',
      createdAt: new Date().toISOString(),
    }

    // Não armazena senha em claro nem atribui plain text ao passwordHash
    mockDb.getState().users.push({
      ...newUser,
      passwordHash: mockHashPassword(body.password),
      wallets: [],
    })

    // Cria automaticamente a primeira carteira com os dados do perfil
    const defaultWallet = {
      id: `wallet_${Date.now()}`,
      userId: newUser.id,
      address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      network: 'Ethereum' as const,
      type: 'primary' as const,
      label: 'Carteira Principal',
      profileName: newUser.name,
      referralCode: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      email: newUser.email,
      ensName: `${newUser.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'colecionador'}.eth`,
      isConnected: true,
      balanceETH: '3.00',
    }
    mockDb.getState().wallets.push(defaultWallet)
    mockDb.save()

    // Mescla itens e favoritos do visitante ao novo usuário
    mockDb.mergeGuestCartIntoUser(newUser.id)
    mockDb.mergeGuestFavoritesIntoUser(newUser.id)

    const issuedAt = Date.now()
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000
    const token = `mock-token-${newUser.id}-${issuedAt}-${expiresAt}`
    const expiresAtIso = new Date(expiresAt).toISOString()

    return HttpResponse.json(
      {
        user: newUser,
        token,
        expiresAt: expiresAtIso,
      },
      { status: 201 },
    )
  }),

  // Login Social (Google & Facebook)
  http.post('/api/auth/social', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const body = (await request.json().catch(() => ({}))) as { provider?: 'google' | 'facebook' }
    const provider = body.provider || 'google'

    const email =
      provider === 'google' ? 'google.collector@nftmarket.dev' : 'facebook.collector@nftmarket.dev'
    const name = provider === 'google' ? 'Google Collector' : 'Facebook Collector'
    const avatar =
      provider === 'google'
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'

    let user = mockDb.getState().users.find((u) => u.email === email)

    if (!user) {
      user = {
        id: `user_${provider}_${Date.now()}`,
        name,
        email,
        avatar,
        bio: `Colecionador autenticado via ${provider.toUpperCase()}.`,
        createdAt: new Date().toISOString(),
        passwordHash: mockHashPassword(`social_oauth_${provider}`),
        wallets: [],
      }
      mockDb.getState().users.push(user)

      mockDb.getState().wallets.push({
        id: `wallet_${Date.now()}`,
        userId: user.id,
        address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        network: 'Ethereum',
        type: 'primary',
        label: `${provider === 'google' ? 'Google' : 'Facebook'} Web3 Vault`,
        profileName: name,
        referralCode: `SOCIAL-${provider.toUpperCase()}`,
        email,
        ensName: `${provider}collector.eth`,
        isConnected: true,
        balanceETH: '5.00',
      })
    }

    mockDb.mergeGuestCartIntoUser(user.id)
    mockDb.mergeGuestFavoritesIntoUser(user.id)
    mockDb.save()

    const issuedAt = Date.now()
    const expiresAt = issuedAt + 24 * 60 * 60 * 1000
    const token = `mock-token-${user.id}-${issuedAt}-${expiresAt}`
    const expiresAtIso = new Date(expiresAt).toISOString()

    return HttpResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      token,
      expiresAt: expiresAtIso,
    })
  }),

  http.get('/api/auth/me', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { user, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    return HttpResponse.json({
      id: user!.id,
      name: user!.name,
      email: user!.email,
      avatar: user!.avatar,
      bio: user!.bio,
      createdAt: user!.createdAt,
    })
  }),

  http.post('/api/auth/logout', async () => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    return HttpResponse.json({ success: true })
  }),

  http.put('/api/auth/password', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { user, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const body = (await request.json().catch(() => ({}))) as {
      currentPassword?: string
      newPassword?: string
    }

    if (!user || !verifyMockPassword(body.currentPassword || '', user.passwordHash)) {
      return HttpResponse.json({ message: 'Senha atual incorreta.' }, { status: 400 })
    }

    user.passwordHash = mockHashPassword(body.newPassword || '')
    mockDb.save()

    return HttpResponse.json({ success: true })
  }),

  // --- NFTS (CATÁLOGO & DETALHE) ---
  http.get('/api/nfts', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const url = new URL(request.url)
    const q = (url.searchParams.get('q') || '').toLowerCase().trim()
    const collection = url.searchParams.get('collection') || ''
    const rarity = url.searchParams.get('rarity') || ''
    const sort = url.searchParams.get('sort') || 'recent'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10))
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')

    let items = [...mockDb.getNFTs()]

    // Filtro por busca de texto
    if (q) {
      items = items.filter(
        (nft) =>
          nft.title.toLowerCase().includes(q) ||
          nft.description.toLowerCase().includes(q) ||
          nft.collection.toLowerCase().includes(q) ||
          nft.creator.name.toLowerCase().includes(q),
      )
    }

    // Filtro por coleção
    if (collection) {
      items = items.filter((nft) => nft.collection.toLowerCase() === collection.toLowerCase())
    }

    // Filtro por raridade
    if (rarity) {
      items = items.filter((nft) => nft.rarity.toLowerCase() === rarity.toLowerCase())
    }

    // Filtro por preço com aritmética decimal exata
    if (minPrice) {
      items = items.filter((nft) => decimalCompare(nft.price, minPrice) >= 0)
    }
    if (maxPrice) {
      items = items.filter((nft) => decimalCompare(nft.price, maxPrice) <= 0)
    }

    // Ordenação com precisão decimal de ETH
    items.sort((a, b) => {
      if (sort === 'price_asc') {
        return decimalCompare(a.price, b.price)
      }
      if (sort === 'price_desc') {
        return decimalCompare(b.price, a.price)
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const total = items.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedItems = items.slice(offset, offset + limit)

    return HttpResponse.json({
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    })
  }),

  http.get('/api/nfts/:id', async ({ params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const nft = mockDb.getNFTById(params.id as string)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado no catálogo.' }, { status: 404 })
    }

    return HttpResponse.json(nft)
  }),

  // --- FAVORITOS (Suporta visitantes e colecionadores autenticados) ---
  http.get('/api/favorites/details', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const favoriteIds = mockDb.getFavorites(userId)
    const allNfts = mockDb.getNFTs()
    const favoriteNFTs = favoriteIds
      .map((id) => allNfts.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => !!n)

    return HttpResponse.json(favoriteNFTs)
  }),

  http.get('/api/favorites', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const favoriteIds = mockDb.getFavorites(userId)
    return HttpResponse.json(favoriteIds)
  }),

  http.post('/api/favorites/toggle', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const body = (await request.json().catch(() => ({}))) as { nftId?: string }
    const nftId = body.nftId

    if (!nftId) {
      return HttpResponse.json({ message: 'ID do NFT é obrigatório.' }, { status: 400 })
    }

    const nft = mockDb.getNFTById(nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }

    const isFavorite = mockDb.toggleFavorite(userId, nftId)
    return HttpResponse.json({ nftId, isFavorite })
  }),

  http.post('/api/favorites/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const nftId = params.id as string

    const nft = mockDb.getNFTById(nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }

    const isFavorite = mockDb.toggleFavorite(userId, nftId)
    return HttpResponse.json({ nftId, isFavorite })
  }),

  // --- CARRINHO & COTAÇÃO ---
  http.get('/api/cart', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const cart = mockDb.getCart(userId)

    const populatedItems = cart.items.map((item) => {
      const nft = mockDb.getNFTById(item.nftId)
      return {
        ...item,
        nft: nft || {
          id: item.nftId,
          title: 'NFT Desconhecido',
          price: item.unitPrice,
          image: '',
          collection: '',
          availableEditions: 0,
          totalEditions: 0,
          rarity: 'Comum' as const,
          description: '',
          creator: { name: 'Desconhecido', avatar: '', address: '0x0' },
          network: 'Ethereum' as const,
          contractAddress: '0x0',
          tokenId: '0',
          tokenStandard: 'ERC-721' as const,
          createdAt: new Date().toISOString(),
          version: 1,
        },
      }
    })

    return HttpResponse.json({
      ...cart,
      items: populatedItems,
    })
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const body = (await request.json().catch(() => ({}))) as {
      nftId?: string
      quantity?: number
      edition?: number
    }

    if (!body.nftId) {
      return HttpResponse.json({ message: 'ID do NFT é obrigatório.' }, { status: 400 })
    }

    const nft = mockDb.getNFTById(body.nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }

    const qty = Math.max(1, body.quantity || 1)
    if (nft.availableEditions < qty) {
      return HttpResponse.json(
        { message: `Estoque insuficiente. Restam apenas ${nft.availableEditions} edições.` },
        { status: 409 },
      )
    }

    const cart = mockDb.getCart(userId)
    const edition = body.edition || 1
    const existing = cart.items.find((i) => i.nftId === body.nftId && i.edition === edition)

    if (existing) {
      if (existing.quantity + qty > nft.availableEditions) {
        return HttpResponse.json(
          { message: `Limite de edições excedido para este NFT.` },
          { status: 409 },
        )
      }
      existing.quantity += qty
    } else {
      const newItem: CartItem = {
        id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nftId: nft.id,
        edition,
        quantity: qty,
        unitPrice: nft.price,
        nft,
      }
      cart.items.push(newItem)
    }

    mockDb.setCart(userId, cart)
    const quote = mockDb.calculateQuote(userId)

    return HttpResponse.json({ cart, quote }, { status: 201 })
  }),

  http.patch('/api/cart/items/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const body = (await request.json().catch(() => ({}))) as { quantity?: number; edition?: number }
    const nftId = params.id as string
    const edition = body.edition || 1
    const quantity = Math.max(0, body.quantity !== undefined ? body.quantity : 1)

    const cart = mockDb.getCart(userId)
    const itemIndex = cart.items.findIndex((i) => i.nftId === nftId && i.edition === edition)

    if (itemIndex === -1) {
      return HttpResponse.json({ message: 'Item não encontrado no carrinho.' }, { status: 404 })
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1)
    } else {
      const nft = mockDb.getNFTById(nftId)
      if (nft && nft.availableEditions < quantity) {
        return HttpResponse.json(
          { message: `Estoque insuficiente. Restam apenas ${nft.availableEditions} edições.` },
          { status: 409 },
        )
      }
      cart.items[itemIndex].quantity = quantity
    }

    mockDb.setCart(userId, cart)
    const quote = mockDb.calculateQuote(userId)

    return HttpResponse.json({ cart, quote })
  }),

  http.delete('/api/cart/items/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const url = new URL(request.url)
    const editionParam = url.searchParams.get('edition')
    const edition = editionParam ? parseInt(editionParam, 10) : null
    const nftId = params.id as string

    const cart = mockDb.getCart(userId)
    cart.items = cart.items.filter((i) => {
      if (i.nftId !== nftId) return true
      if (edition !== null && i.edition !== edition) return true
      return false
    })

    if (cart.items.length === 0) {
      cart.couponCode = null
    }

    mockDb.setCart(userId, cart)
    const quote = mockDb.calculateQuote(userId)

    return HttpResponse.json({ cart, quote })
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const body = (await request.json().catch(() => ({}))) as { code?: string }
    const code = (body.code || '').trim().toUpperCase()

    if (!code) {
      return HttpResponse.json({ message: 'Código do cupom é obrigatório.' }, { status: 400 })
    }

    const coupons = mockDb.getState().coupons
    const coupon = coupons.find((c) => c.code.toUpperCase() === code)

    if (!coupon) {
      return HttpResponse.json(
        { message: 'Cupom não encontrado. Verifique o código digitado.' },
        { status: 404 },
      )
    }

    if (!coupon.active || new Date(coupon.expiresAt) <= new Date()) {
      return HttpResponse.json(
        { message: 'Este cupom de desconto está expirado ou foi desativado.' },
        { status: 400 },
      )
    }

    const cart = mockDb.getCart(userId)
    cart.couponCode = coupon.code
    mockDb.setCart(userId, cart)

    const quote = mockDb.calculateQuote(userId)
    return HttpResponse.json({ cart, quote })
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    const cart = mockDb.getCart(userId)
    cart.couponCode = null
    mockDb.setCart(userId, cart)

    const quote = mockDb.calculateQuote(userId)
    return HttpResponse.json({ cart, quote })
  }),

  http.get('/api/cart/quote', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getOptionalUserId(request)
    return HttpResponse.json(mockDb.calculateQuote(userId))
  }),

  // --- PEDIDOS COM IDEMPOTÊNCIA E CICLO DE RESERVA/COMMIT ---
  http.post('/api/orders', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { userId, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const idempotencyKey = request.headers.get('Idempotency-Key') || ''
    if (!idempotencyKey) {
      return HttpResponse.json(
        { message: 'Header Idempotency-Key é obrigatório para criação de pedidos.' },
        { status: 400 },
      )
    }

    const rawBody = await request.json().catch(() => null)
    const parseResult = CreateOrderInputSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return HttpResponse.json(
        {
          message: 'Dados do pedido inválidos.',
          errors: parseResult.error.flatten(),
        },
        { status: 400 },
      )
    }
    const body = parseResult.data

    // Normaliza os dados completos que definem a compra para garantia estrita de idempotência
    const normalizedItems = [...body.items]
      .map((i) => ({ nftId: i.nftId, edition: i.edition, quantity: i.quantity }))
      .sort((a, b) => a.nftId.localeCompare(b.nftId) || a.edition - b.edition)

    const payloadHash = JSON.stringify({
      items: normalizedItems,
      wallet: body.walletAddress.toLowerCase().trim(),
      network: body.network,
      couponCode: body.couponCode ? body.couponCode.toUpperCase().trim() : null,
      quoteVersion: body.quoteVersion,
    })

    // Validação de idempotência:
    const existingOrder = mockDb.getOrderByIdempotencyKey(idempotencyKey)
    if (existingOrder) {
      const record = mockDb.getState().idempotencyRecords[idempotencyKey]
      if (record && record.payloadHash !== payloadHash) {
        return HttpResponse.json(
          {
            message:
              'Conflito de idempotência: a chave fornecida já foi utilizada com dados diferentes da compra.',
          },
          { status: 409 },
        )
      }
      return HttpResponse.json(existingOrder, { status: 200 })
    }

    // Injeção de cenário: falha de pedido forçada
    if (mockDb.getScenario().forceOrderFail) {
      return HttpResponse.json(
        { message: 'Transação recusada pela rede de blockchain simulada.' },
        { status: 400 },
      )
    }

    // Revalidar estoque e preço de cada item
    for (const item of body.items) {
      const nft = mockDb.getNFTById(item.nftId)
      if (!nft) {
        return HttpResponse.json(
          { message: `NFT ${item.nftId} não está mais disponível no catálogo.` },
          { status: 409 },
        )
      }
      if (nft.availableEditions < item.quantity) {
        return HttpResponse.json(
          {
            message: `Conflito de estoque: restam apenas ${nft.availableEditions} edições do NFT "${nft.title}".`,
          },
          { status: 409 },
        )
      }
    }

    // Revalidar cotação e versão contra preços atualizados em tempo real
    const currentQuote = mockDb.calculateQuote(userId!)
    if (body.quoteVersion && body.quoteVersion < currentQuote.quoteVersion) {
      return HttpResponse.json(
        {
          message:
            'Cotação desatualizada: o preço dos itens foi recalculado na rede. Por favor, revise a nova cotação antes de concluir a compra.',
        },
        { status: 409 },
      )
    }

    // Monta snapshot imutável dos itens e valores congelados
    const snapshots = body.items.map((i) => {
      const nft = mockDb.getNFTById(i.nftId)!
      return {
        nftId: nft.id,
        title: nft.title,
        collection: nft.collection,
        image: nft.image,
        edition: i.edition,
        quantity: i.quantity,
        unitPriceETH: nft.price,
      }
    })

    const orderId = `ord_${Date.now()}`
    const isPending = !!mockDb.getScenario().simulatePendingOrder
    const order = {
      id: orderId,
      idempotencyKey,
      userId: userId!,
      status: (isPending ? 'pending' : 'confirmed') as 'pending' | 'confirmed',
      items: snapshots,
      subtotalETH: currentQuote.subtotalETH,
      discountETH: currentQuote.discountETH,
      networkFeeETH: currentQuote.networkFeeETH,
      totalETH: currentQuote.totalETH,
      coupon: currentQuote.coupon,
      walletAddress: body.walletAddress,
      network: body.network,
      transactionHash: isPending
        ? undefined
        : `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    }

    mockDb.saveOrder(order, idempotencyKey, payloadHash)

    if (isPending) {
      // Pedido PENDENTE: Reserva o estoque, NÃO remove itens do carrinho nem debita definitivamente
      mockDb.reserveStock(orderId, body.items)
    } else {
      // Pedido CONFIRMADO: Debita o estoque e remove apenas as quantidades efetivamente compradas
      mockDb.reserveStock(orderId, body.items)
      mockDb.commitOrder(orderId, userId!)
    }

    // Cenário MSW: Simulação de perda/timeout da resposta após criação do pedido no servidor
    if (mockDb.getScenario().simulateTimeoutAfterOrderCreation) {
      mockDb.updateScenario({ simulateTimeoutAfterOrderCreation: false })
      return HttpResponse.json(
        { message: 'Timeout de rede: tempo limite de resposta esgotado após criação na rede.' },
        { status: 504 },
      )
    }

    return HttpResponse.json(order, { status: 201 })
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { userId, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const order = mockDb.getOrder(params.id as string)
    if (!order) {
      return HttpResponse.json({ message: 'Pedido não encontrado.' }, { status: 404 })
    }

    // Garante isolamento estrito: só retorna pedido se pertencer ao colecionador autenticado
    if (order.userId !== userId) {
      return HttpResponse.json(
        { message: 'Acesso negado: você não tem permissão para visualizar este pedido.' },
        { status: 403 },
      )
    }

    return HttpResponse.json(order)
  }),

  http.get('/api/orders', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { userId, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const myOrders = mockDb.getState().orders.filter((o) => o.userId === userId)
    return HttpResponse.json(myOrders)
  }),

  // --- PERFIL ---
  http.get('/api/profile', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { user, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    return HttpResponse.json({
      id: user!.id,
      name: user!.name,
      email: user!.email,
      avatar: user!.avatar,
      bio: user!.bio,
      createdAt: user!.createdAt,
    })
  }),

  http.patch('/api/profile', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { user, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const body = (await request.json().catch(() => ({}))) as Partial<User>
    if (body.name) user!.name = body.name
    if (body.bio !== undefined) user!.bio = body.bio
    if (body.avatar) user!.avatar = body.avatar
    mockDb.save()

    return HttpResponse.json({
      id: user!.id,
      name: user!.name,
      email: user!.email,
      avatar: user!.avatar,
      bio: user!.bio,
      createdAt: user!.createdAt,
    })
  }),

  // --- CARTEIRAS ---
  http.get('/api/wallets', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { userId, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const wallets = mockDb.getState().wallets.filter((w) => w.userId === userId)
    return HttpResponse.json(wallets)
  }),

  http.post('/api/wallets', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { userId, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const rawBody = await request.json().catch(() => null)
    const parseResult = CreateWalletInputSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return HttpResponse.json(
        { message: 'Dados da carteira inválidos.', errors: parseResult.error.flatten() },
        { status: 400 },
      )
    }
    const body = parseResult.data

    // Se a nova carteira for 'primary', desmarca a anterior
    if (body.type === 'primary') {
      mockDb.getState().wallets.forEach((w) => {
        if (w.userId === userId && w.type === 'primary') {
          w.type = 'secondary'
        }
      })
    }

    const newWallet = {
      id: `wallet_${Date.now()}`,
      userId: userId!,
      address: body.address,
      network: body.network,
      type: body.type,
      label: body.label || 'Minha Carteira',
      profileName: body.profileName || 'Colecionador',
      referralCode: body.referralCode || 'NFT-2026',
      email: body.email,
      ensName: body.ensName || '',
      isConnected: true,
      balanceETH: '2.50',
    }

    mockDb.getState().wallets.push(newWallet)
    mockDb.save()

    return HttpResponse.json(newWallet, { status: 201 })
  }),

  http.patch('/api/wallets/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { userId, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    const wallet = mockDb.getState().wallets.find((w) => w.id === params.id && w.userId === userId)
    if (!wallet) {
      return HttpResponse.json({ message: 'Carteira não encontrada.' }, { status: 404 })
    }

    const rawBody = await request.json().catch(() => ({}))
    const parseResult = UpdateWalletInputSchema.safeParse(rawBody)
    const body = parseResult.success ? parseResult.data : (rawBody as Partial<typeof wallet>)

    if (body.type === 'primary') {
      mockDb.getState().wallets.forEach((w) => {
        if (w.userId === userId && w.id !== wallet.id && w.type === 'primary') {
          w.type = 'secondary'
        }
      })
      wallet.type = 'primary'
    } else if (body.type === 'secondary') {
      wallet.type = 'secondary'
    }

    if (body.label !== undefined) wallet.label = body.label
    if (body.profileName !== undefined) wallet.profileName = body.profileName
    if (body.referralCode !== undefined) wallet.referralCode = body.referralCode
    if (body.email !== undefined) wallet.email = body.email
    if (body.ensName !== undefined) wallet.ensName = body.ensName
    if (body.network !== undefined) wallet.network = body.network
    if ('address' in body && body.address) wallet.address = body.address as string
    if ('isConnected' in body && body.isConnected !== undefined) wallet.isConnected = Boolean(body.isConnected)
    mockDb.save()

    return HttpResponse.json(wallet)
  }),

  http.delete('/api/wallets/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const { userId, errorResponse } = validateSession(request)
    if (errorResponse) return errorResponse

    mockDb.getState().wallets = mockDb
      .getState()
      .wallets.filter((w) => !(w.id === params.id && w.userId === userId))
    mockDb.save()

    return HttpResponse.json({ success: true })
  }),

  // --- ENDPOINTS DE SIMULAÇÃO DE CENÁRIOS E TEMPO REAL ---
  http.post('/api/mock/scenario', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Partial<
      ReturnType<typeof mockDb.getScenario>
    >
    mockDb.updateScenario(body)
    return HttpResponse.json({
      success: true,
      scenario: mockDb.getScenario(),
    })
  }),

  http.post('/api/mock/trigger-price-update', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      nftId?: string
      price?: string
      availableEditions?: number
    }
    const nftId = body.nftId || 'nft_1'
    const nft = mockDb.getNFTById(nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado' }, { status: 404 })
    }
    const currentPrice = nft.price
    const newPrice = body.price || decimalAdd(currentPrice, '0.25')
    const newEditions =
      body.availableEditions !== undefined ? body.availableEditions : nft.availableEditions

    const updated = broadcastNFTUpdated(nftId, {
      price: newPrice,
      availableEditions: newEditions,
    })

    return HttpResponse.json({
      success: true,
      nft: updated,
    })
  }),

  http.post('/api/mock/trigger-order-update', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string
      status?: 'pending' | 'confirmed' | 'rejected'
      reason?: string
    }
    const orders = mockDb.getState().orders
    const targetOrder = body.orderId
      ? orders.find((o) => o.id === body.orderId)
      : orders[orders.length - 1]

    if (!targetOrder) {
      return HttpResponse.json({ message: 'Nenhum pedido encontrado' }, { status: 404 })
    }

    const updated = broadcastOrderUpdated(targetOrder.id, body.status || 'confirmed', body.reason)

    return HttpResponse.json({
      success: true,
      order: updated,
    })
  }),

  http.post('/api/mock/trigger-raw-event', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      event: string
      payload: unknown
    }
    if (body.event) {
      emitRawSocketEvent(body.event, body.payload)
    }
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/mock/reset', async () => {
    mockDb.reset()
    return HttpResponse.json({ success: true })
  }),
]
