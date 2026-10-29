import { expect, test } from '@playwright/test'

test.describe('3. Autenticação, Sessão, Logout e Expiração', () => {
  test('deve realizar login com sucesso e persistir após refresh', async ({ page }) => {
    await page.goto('/login')

    // Preenche credenciais demo
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()

    // Verifica redirecionamento e header autenticado
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i }).first()).toBeVisible()

    // Recarrega a página (F5) para verificar persistência de sessão
    await page.reload()
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i }).first()).toBeVisible()
  })

  test('deve realizar logout e limpar dados privados', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i }).first()).toBeVisible()

    // Clica no botão de logout no header (desktop) ou via perfil (mobile)
    const logoutBtn = page.getByRole('button', { name: /Sair da conta/i }).first()
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
    } else {
      await page.goto('/profile')
      await page.getByRole('button', { name: /Sair da conta/i }).click()
    }

    // Verifica que voltou para estado não autenticado
    await expect(page.getByRole('link', { name: /Conectar/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i })).not.toBeVisible()
  })

  test('deve tratar expiração de sessão (401) e redirecionar adequadamente', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()

    // Simula expiração disparando erro HTTP 401 via cenário MSW
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: 401 }),
      })
    })

    // Recarrega a página ou realiza chamada à API: axios captura 401 e processa logout
    await page.reload()

    // Verifica feedback de sessão expirada e limpeza do estado
    await expect(page.getByText(/Sua sessão expirou/i).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Conectar/i }).first()).toBeVisible()

    // Restaura o cenário padrão
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: null }),
      })
    })
  })

  test('deve registrar novo colecionador com sucesso', async ({ page }) => {
    await page.goto('/register')
    const rand = Math.floor(Math.random() * 100000)
    await page.getByPlaceholder('Nome de usuário').fill(`Colecionador ${rand}`)
    await page.getByPlaceholder('Digite seu e-mail').fill(`novo_${rand}@nftmarket.dev`)
    await page.getByPlaceholder('Senha', { exact: true }).fill('password123')
    await page.getByPlaceholder('Confirmar senha').fill('password123')
    await page.getByRole('button', { name: /Criar perfil/i }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: new RegExp(`Colecionador ${rand}`, 'i') }).first()).toBeVisible()
  })

  test('deve garantir isolamento de dados entre diferentes usuários (Satoshi vs Elena)', async ({ page }) => {
    // 1. Login como Satoshi
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i }).first()).toBeVisible()

    // 2. Acessa favoritos do Satoshi
    await page.goto('/favorites')
    await expect(page.getByRole('heading', { name: /Meus Favoritos/i })).toBeVisible()

    // 3. Logout
    const logoutBtn = page.getByRole('button', { name: /Sair da conta/i }).first()
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
    } else {
      await page.goto('/profile')
      await page.getByRole('button', { name: /Sair da conta/i }).first().click()
    }
    await expect(page.getByRole('link', { name: /Conectar/i }).first()).toBeVisible()

    // 4. Login como Elena
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('elena@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: /Elena Rostova/i }).first()).toBeVisible()

    // 5. Verifica que a lista de favoritos e sessão pertencem exclusivamente a Elena
    await page.goto('/favorites')
    await expect(page.getByRole('heading', { name: /Meus Favoritos/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Elena Rostova/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i })).toHaveCount(0)
  })

  test('deve preencher credenciais de demonstração (Elena e Satoshi) via botões rápidos e autenticar', async ({ page }) => {
    await page.goto('/login')

    // 1. Testa botão rápido da Elena Rostova
    await page.getByRole('button', { name: /Elena R\./i }).click()
    await expect(page.getByLabel('E-mail')).toHaveValue('elena@nftmarket.dev')
    await expect(page.getByLabel('Senha')).toHaveValue('password123')

    // Realiza login
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: /Elena Rostova/i }).first()).toBeVisible()

    // 2. Faz logout e testa botão rápido do Satoshi Nakamoto
    const logoutBtn = page.getByRole('button', { name: /Sair da conta/i }).first()
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
    } else {
      await page.goto('/profile')
      await page.getByRole('button', { name: /Sair da conta/i }).first().click()
    }
    await expect(page.getByRole('link', { name: /Conectar/i }).first()).toBeVisible()

    await page.goto('/login')
    await page.getByRole('button', { name: /Satoshi N\./i }).click()
    await expect(page.getByLabel('E-mail')).toHaveValue('satoshi@nftmarket.dev')
    await expect(page.getByLabel('Senha')).toHaveValue('password123')

    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i }).first()).toBeVisible()
  })

  test('deve proteger a rota GET /api/orders/:id com HTTP 403 quando um usuário tenta acessar pedido de outro usuário', async ({ page }) => {
    // 1. Login como Satoshi e cria um pedido
    await page.goto('/login')
    await page.getByRole('button', { name: /Satoshi N\./i }).click()
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()
    await page.goto('/checkout')
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page).toHaveURL(/order-confirmation\/ord_/)

    // Extrai o orderId da URL
    const url = page.url()
    const orderId = url.split('/').pop()!
    expect(orderId).toMatch(/^ord_/)

    // 2. Consulta o pedido com o token de Satoshi (deve retornar 200)
    const satoshiRes = await page.evaluate(async (id) => {
      const res = await fetch(`/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('nft_market_token')}`,
        },
      })
      return { status: res.status }
    }, orderId)
    expect(satoshiRes.status).toBe(200)

    // 3. Obtém token de Elena Rostova
    const elenaToken = await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'elena@nftmarket.dev', password: 'password123' }),
      })
      const data = await res.json()
      return data.token
    })

    // 4. Elena tenta acessar o pedido de Satoshi: deve retornar HTTP 403 Forbidden
    const elenaRes = await page.evaluate(async ({ id, token }) => {
      const res = await fetch(`/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return { status: res.status, data: await res.json() }
    }, { id: orderId, token: elenaToken })

    expect(elenaRes.status).toBe(403)
    expect(elenaRes.data.message).toMatch(/Acesso negado/i)
  })

  test('deve salvar contexto de redirecionamento na expiração de sessão e retomar para a tela de checkout após novo login', async ({ page }) => {
    // 1. Login com Satoshi
    await page.goto('/login')
    await page.getByRole('button', { name: /Satoshi N\./i }).click()
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    // 2. Adiciona item e vai para o checkout
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: /Pagamento/i })).toBeVisible()

    // 3. Simula expiração de sessão com HTTP 401
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: 401 }),
      })
    })

    // 4. Tenta carregar dados ou recarrega: sessão expira
    await page.reload()
    await expect(page.getByText(/Sua sessão expirou/i).first()).toBeVisible()
    await expect(page).toHaveURL(/\/login/)

    // Desativa status de erro 401
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: null }),
      })
    })

    // 5. Faz login novamente: deve retomar para /checkout
    await page.getByRole('button', { name: /Satoshi N\./i }).click()
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()

    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByRole('heading', { name: /Pagamento/i })).toBeVisible()
  })
})

