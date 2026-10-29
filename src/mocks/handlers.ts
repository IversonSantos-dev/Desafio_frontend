import { delay, http, HttpResponse } from 'msw'
import type {
  CartItem,
  CreateOrderInput,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '@/contracts'
import { mockDb } from './db'
import { broadcastNFTUpdated, broadcastOrderUpdated, emitRawSocketEvent } from './socket'

// Helper para obter userId a partir do token no header Authorization
function getUserIdFromAuth(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  // Token format: "mock-token-{userId}-{timestamp}"
  const parts = token.split('-')
  if (parts.length >= 3 && parts[0] === 'mock' && parts[1] === 'token') {
    return parts[2]
  }
  return null
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

    const body = (await request.json()) as LoginCredentials
    const users = mockDb.getState().users
    const user = users.find((u) => u.email.toLowerCase() === body.email.toLowerCase())

    if (!user || user.passwordHash !== body.password) {
      return HttpResponse.json(
        { message: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 },
      )
    }

    const token = `mock-token-${user.id}-${Date.now()}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

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
      expiresAt,
    })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const body = (await request.json()) as RegisterCredentials
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

    mockDb.getState().users.push({
      ...newUser,
      passwordHash: body.password,
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

    const token = `mock-token-${newUser.id}-${Date.now()}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    return HttpResponse.json(
      {
        user: newUser,
        token,
        expiresAt,
      },
      { status: 201 },
    )
  }),

  // Login Social (Google & Facebook)
  http.post('/api/auth/social', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const body = (await request.json()) as { provider: 'google' | 'facebook' }
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
        passwordHash: 'social_login',
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

    const token = `mock-token-${user.id}-${Date.now()}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

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
      expiresAt,
    })
  }),

  http.get('/api/auth/me', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Sessão inválida ou expirada.' }, { status: 401 })
    }

    const user = mockDb.getState().users.find((u) => u.id === userId)
    if (!user) {
      return HttpResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 })
    }

    return HttpResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
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

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Sessão expirada.' }, { status: 401 })
    }

    const body = (await request.json()) as { currentPassword?: string; newPassword?: string }
    const user = mockDb.getState().users.find((u) => u.id === userId)
    if (!user || user.passwordHash !== body.currentPassword) {
      return HttpResponse.json({ message: 'Senha atual incorreta.' }, { status: 400 })
    }

    user.passwordHash = body.newPassword || ''
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

    // Filtro por preço
    if (minPrice) {
      const min = parseFloat(minPrice)
      items = items.filter((nft) => parseFloat(nft.price) >= min)
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice)
      items = items.filter((nft) => parseFloat(nft.price) <= max)
    }

    // Ordenação com precisão numérica de ETH
    items.sort((a, b) => {
      if (sort === 'price_asc') {
        return parseFloat(a.price) - parseFloat(b.price)
      }
      if (sort === 'price_desc') {
        return parseFloat(b.price) - parseFloat(a.price)
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
  http.get('/api/favorites', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    return HttpResponse.json(mockDb.getFavorites(userId))
  }),

  http.get('/api/favorites/details', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    const favIds = mockDb.getFavorites(userId)
    const nfts = mockDb.getNFTs().filter((n) => favIds.includes(n.id))
    return HttpResponse.json(nfts)
  }),

  http.post('/api/favorites/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    const nftId = params.id as string
    const nft = mockDb.getNFTById(nftId)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT inexistente.' }, { status: 404 })
    }

    const isFavorite = mockDb.toggleFavorite(userId, nftId)
    return HttpResponse.json({ nftId, isFavorite })
  }),

  // --- CARRINHO & COTAÇÃO ---
  http.get('/api/cart', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    return HttpResponse.json(mockDb.getCart(userId))
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    const body = (await request.json()) as { nftId: string; edition?: number; quantity?: number }
    const nft = mockDb.getNFTById(body.nftId)

    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    }

    if (nft.availableEditions <= 0) {
      return HttpResponse.json({ message: 'Esta edição já está esgotada.' }, { status: 409 })
    }

    const cart = mockDb.getCart(userId)
    const edition = body.edition || 1
    const quantityToAdd = Math.max(1, body.quantity || 1)

    const existingIndex = cart.items.findIndex(
      (i) => i.nftId === body.nftId && i.edition === edition,
    )

    if (existingIndex >= 0) {
      const newTotal = cart.items[existingIndex].quantity + quantityToAdd
      if (newTotal > nft.availableEditions) {
        return HttpResponse.json(
          {
            message: `Limite excedido. Restam apenas ${nft.availableEditions} edições disponíveis.`,
          },
          { status: 400 },
        )
      }
      cart.items[existingIndex].quantity = newTotal
      cart.items[existingIndex].unitPrice = nft.price
      cart.items[existingIndex].nft = nft
    } else {
      const newItem: CartItem = {
        id: `cart_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nftId: nft.id,
        edition,
        quantity: quantityToAdd,
        unitPrice: nft.price,
        nft,
      }
      cart.items.push(newItem)
    }

    mockDb.setCart(userId, cart)
    return HttpResponse.json(cart)
  }),

  http.patch('/api/cart/items/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    const body = (await request.json()) as { quantity: number }
    const cart = mockDb.getCart(userId)
    const item = cart.items.find((i) => i.id === params.id)

    if (!item) {
      return HttpResponse.json({ message: 'Item não encontrado no carrinho.' }, { status: 404 })
    }

    const nft = mockDb.getNFTById(item.nftId)
    if (nft && body.quantity > nft.availableEditions) {
      return HttpResponse.json(
        { message: `Quantidade indisponível. Estoque máximo: ${nft.availableEditions}.` },
        { status: 400 },
      )
    }

    item.quantity = Math.max(1, body.quantity)
    mockDb.setCart(userId, cart)
    return HttpResponse.json(cart)
  }),

  http.delete('/api/cart/items/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    const cart = mockDb.getCart(userId)
    cart.items = cart.items.filter((i) => i.id !== params.id)
    mockDb.setCart(userId, cart)
    return HttpResponse.json(cart)
  }),

  http.post('/api/cart/coupon', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    const body = (await request.json()) as { code: string }
    const code = (body.code || '').trim().toUpperCase()

    const coupon = mockDb.getState().coupons.find((c) => c.code.toUpperCase() === code)
    if (!coupon) {
      return HttpResponse.json({ message: 'Cupom de desconto inválido.' }, { status: 404 })
    }

    if (!coupon.active || new Date(coupon.expiresAt) <= new Date()) {
      return HttpResponse.json(
        { message: 'Este cupom de desconto está expirado.' },
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

    const userId = getUserIdFromAuth(request) || 'guest'
    const cart = mockDb.getCart(userId)
    cart.couponCode = null
    mockDb.setCart(userId, cart)

    const quote = mockDb.calculateQuote(userId)
    return HttpResponse.json({ cart, quote })
  }),

  http.get('/api/cart/quote', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request) || 'guest'
    return HttpResponse.json(mockDb.calculateQuote(userId))
  }),

  // --- PEDIDOS COM IDEMPOTÊNCIA ---
  http.post('/api/orders', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json(
        { message: 'Autenticação necessária para finalizar o pedido.' },
        { status: 401 },
      )
    }

    const idempotencyKey = request.headers.get('Idempotency-Key') || ''
    if (!idempotencyKey) {
      return HttpResponse.json(
        { message: 'Header Idempotency-Key é obrigatório para criação de pedidos.' },
        { status: 400 },
      )
    }

    const body = (await request.json()) as CreateOrderInput
    const payloadHash = JSON.stringify({ items: body.items, wallet: body.walletAddress })

    // Validação de idempotência:
    const existingOrder = mockDb.getOrderByIdempotencyKey(idempotencyKey)
    if (existingOrder) {
      const record = mockDb.getState().idempotencyRecords[idempotencyKey]
      if (record && record.payloadHash !== payloadHash) {
        return HttpResponse.json(
          {
            message:
              'Conflito de idempotência: a chave fornecida já foi utilizada com dados diferentes.',
          },
          { status: 409 },
        )
      }
      // Retorna o pedido previamente gerado
      return HttpResponse.json(existingOrder)
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
    const currentQuote = mockDb.calculateQuote(userId)
    if (body.quoteVersion && body.quoteVersion < currentQuote.quoteVersion) {
      return HttpResponse.json(
        {
          message:
            'Cotação desatualizada: o preço dos itens foi recalculado na rede. Por favor, revise a nova cotação antes de concluir a compra.',
        },
        { status: 409 },
      )
    }

    // Calcula cotação final congelada
    const quote = currentQuote

    // Monta snapshot dos itens
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
      userId,
      status: (isPending ? 'pending' : 'confirmed') as 'pending' | 'confirmed',
      items: snapshots,
      subtotalETH: quote.subtotalETH,
      discountETH: quote.discountETH,
      networkFeeETH: quote.networkFeeETH,
      totalETH: quote.totalETH,
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

    // Abate o estoque dos NFTs comprados
    body.items.forEach((item) => {
      const nft = mockDb.getNFTById(item.nftId)
      if (nft) {
        mockDb.updateNFT(nft.id, {
          availableEditions: Math.max(0, nft.availableEditions - item.quantity),
        })
      }
    })

    // Limpa apenas os itens comprados do carrinho
    const cart = mockDb.getCart(userId)
    const boughtKeys = new Set(body.items.map((i) => `${i.nftId}-${i.edition}`))
    cart.items = cart.items.filter((i) => !boughtKeys.has(`${i.nftId}-${i.edition}`))
    if (cart.items.length === 0) cart.couponCode = null
    mockDb.setCart(userId, cart)

    return HttpResponse.json(order, { status: 201 })
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

    const order = mockDb.getOrder(params.id as string)
    if (!order) {
      return HttpResponse.json({ message: 'Pedido não encontrado.' }, { status: 404 })
    }

    return HttpResponse.json(order)
  }),

  http.get('/api/orders', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

    const myOrders = mockDb.getState().orders.filter((o) => o.userId === userId)
    return HttpResponse.json(myOrders)
  }),

  // --- PERFIL ---
  http.get('/api/profile', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

    const user = mockDb.getState().users.find((u) => u.id === userId)
    if (!user) {
      return HttpResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 })
    }

    return HttpResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    })
  }),

  http.patch('/api/profile', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<User>
    const user = mockDb.getState().users.find((u) => u.id === userId)
    if (!user) {
      return HttpResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 })
    }

    if (body.name) user.name = body.name
    if (body.bio !== undefined) user.bio = body.bio
    if (body.avatar) user.avatar = body.avatar
    mockDb.save()

    return HttpResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    })
  }),

  // --- CARTEIRAS ---
  http.get('/api/wallets', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

    const wallets = mockDb.getState().wallets.filter((w) => w.userId === userId)
    return HttpResponse.json(wallets)
  }),

  http.post('/api/wallets', async ({ request }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

    const body = (await request.json()) as {
      address: string
      network: 'Ethereum' | 'Polygon'
      type: 'primary' | 'secondary'
      label: string
      profileName: string
      referralCode?: string
      email: string
      ensName?: string
    }

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
      userId,
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

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

    const wallet = mockDb.getState().wallets.find((w) => w.id === params.id && w.userId === userId)
    if (!wallet) {
      return HttpResponse.json({ message: 'Carteira não encontrada.' }, { status: 404 })
    }

    const body = (await request.json()) as Partial<typeof wallet>
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
    if (body.isConnected !== undefined) wallet.isConnected = body.isConnected
    mockDb.save()

    return HttpResponse.json(wallet)
  }),

  http.delete('/api/wallets/:id', async ({ request, params }) => {
    const scenarioError = await applyScenario()
    if (scenarioError) return scenarioError

    const userId = getUserIdFromAuth(request)
    if (!userId) {
      return HttpResponse.json({ message: 'Autenticação necessária.' }, { status: 401 })
    }

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
    const currentPrice = parseFloat(nft.price)
    const newPrice = body.price || (currentPrice + 0.25).toFixed(2)
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
