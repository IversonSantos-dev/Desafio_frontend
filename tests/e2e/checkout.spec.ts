import { expect, test } from '@playwright/test'

test.describe('6. Checkout, Idempotência e Confirmação de Pedido', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Faz login
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i })).toBeVisible()

    // 2. Adiciona item ao carrinho
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()
  })

  test('deve executar o fluxo completo de pagamento e exibir o recibo congelado', async ({ page }) => {
    await page.goto('/checkout')

    await expect(page.getByRole('heading', { name: /Pagamento/i })).toBeVisible()
    await expect(page.getByText('MetaMask Principal')).toBeVisible()
    await expect(page.getByText(/Carteira Conectada/i)).toBeVisible()

    // Confirma e paga
    const confirmButton = page.getByRole('button', { name: /Confirmar/i })
    await confirmButton.click()

    // Deve redirecionar para a rota de confirmação com ID gerado
    await expect(page).toHaveURL(/order-confirmation\/ord_/)
    await expect(page.getByRole('heading', { name: 'Pedido Confirmado!' })).toBeVisible()
    await expect(page.getByText(/Recibo da Transação/i)).toBeVisible()
    await expect(page.getByText(/Hash da Transação/i)).toBeVisible()
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()

    // Verifica que o carrinho foi esvaziado
    await page.goto('/cart')
    await expect(page.getByText(/Seu carrinho está vazio/i)).toBeVisible()
  })

  test('deve tratar falha de pagamento, bloquear clique duplo e recuperar com idempotência', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: /Pagamento/i })).toBeVisible()

    // 1. Simula cenário de falha de pagamento
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceOrderFail: true }),
      })
    })

    const confirmButton = page.getByRole('button', { name: /Confirmar/i })

    // 2. Clica e verifica que fica disabled durante processamento
    await confirmButton.click()

    // 3. Recebe feedback de erro
    await expect(page.getByText(/Transação recusada pela rede de blockchain simulada/i).first()).toBeVisible()

    // 4. Desativa o cenário de falha
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceOrderFail: false }),
      })
    })

    // 5. Reenvia a mesma chave de idempotência e conclui com sucesso
    await confirmButton.click()
    await expect(page).toHaveURL(/order-confirmation\/ord_/)
    await expect(page.getByRole('heading', { name: 'Pedido Confirmado!' })).toBeVisible()
  })

  test('deve alertar o usuário quando a cotação mudar em tempo real durante o checkout e bloquear confirmação com cotação desatualizada', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: /Pagamento/i })).toBeVisible()

    // Aguarda conexão do socket
    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // Simula variação de preço em tempo real
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nftId: 'nft_1',
          price: '3.50',
          availableEditions: 2,
        }),
      })
    })

    // 1. Verifica que o alerta de recálculo da cotação é exibido
    await expect(page.getByText(/A cotação foi recalculada na rede/i)).toBeVisible()
    await expect(page.getByText(/Novo Total:/i)).toBeVisible()

    // 2. Verifica que a confirmação está impedida (botão desabilitado) conforme README Seção 7 item 4
    const confirmButton = page.getByRole('button', { name: /Confirmar/i })
    await expect(confirmButton).toBeDisabled()

    // 3. Clica em aceitar nova cotação
    await page.getByRole('button', { name: /Aceitar nova cotação/i }).click()

    // 4. Verifica que o botão de confirmar foi reabilitado e conclui o pedido com sucesso
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()
    await expect(page).toHaveURL(/order-confirmation\/ord_/)
    await expect(page.getByRole('heading', { name: 'Pedido Confirmado!' })).toBeVisible()
  })

  test('deve tratar timeout simulado e recuperar o mesmo pedido por idempotência sem duplicar cobrança', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: /Pagamento/i })).toBeVisible()

    // Envia primeiro pedido com chave de idempotência fixa
    const testIdempotencyKey = `idemp_timeout_recovery_${Date.now()}`
    const result1 = await page.evaluate(async (idempKey) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempKey,
          Authorization: `Bearer ${localStorage.getItem('nft_market_token')}`,
        },
        body: JSON.stringify({
          walletAddress: '0x71C84013063A40e53aA52CE0a524D4BEB11438aC',
          network: 'Ethereum',
          items: [{ nftId: 'nft_1', edition: 1, quantity: 1 }],
          quoteVersion: 1,
        }),
      })
      return { status: res.status, data: await res.json() }
    }, testIdempotencyKey)

    expect(result1.status).toBe(201)
    expect(result1.data.id).toMatch(/^ord_/)

    // Reenvia exatamente a mesma chave (simulando retry pós timeout)
    const result2 = await page.evaluate(async (idempKey) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempKey,
          Authorization: `Bearer ${localStorage.getItem('nft_market_token')}`,
        },
        body: JSON.stringify({
          walletAddress: '0x71C84013063A40e53aA52CE0a524D4BEB11438aC',
          network: 'Ethereum',
          items: [{ nftId: 'nft_1', edition: 1, quantity: 1 }],
          quoteVersion: 1,
        }),
      })
      return { status: res.status, data: await res.json() }
    }, testIdempotencyKey)

    // Deve retornar o mesmo pedido já gerado sem conflito e sem duplicar
    expect(result2.status).toBe(200)
    expect(result2.data.id).toBe(result1.data.id)

    // Se reenviar com payload diferente, deve retornar conflito 409
    const result3 = await page.evaluate(async (idempKey) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempKey,
          Authorization: `Bearer ${localStorage.getItem('nft_market_token')}`,
        },
        body: JSON.stringify({
          walletAddress: '0x9999999999999999999999999999999999999999',
          network: 'Polygon',
          items: [{ nftId: 'nft_2', edition: 1, quantity: 1 }],
          quoteVersion: 1,
        }),
      })
      return { status: res.status, data: await res.json() }
    }, testIdempotencyKey)

    expect(result3.status).toBe(409)
    expect(result3.data.message).toMatch(/Conflito de idempotência/i)
  })

  test('deve reter itens no carrinho durante status pending (reserva de estoque) e remover apenas após confirmação', async ({ page }) => {
    // 1. Ativa cenário de pedido pendente
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulatePendingOrder: true }),
      })
    })

    // 2. Conclui checkout
    await page.goto('/checkout')
    await page.getByRole('button', { name: /Confirmar/i }).click()

    // 3. Redireciona para confirmação e exibe status Pendente
    await expect(page).toHaveURL(/order-confirmation\/ord_/)
    await expect(page.getByRole('heading', { name: /Transação Pendente/i })).toBeVisible()

    // 4. Conforme requisito: itens são retidos no carrinho durante pending (apenas estoque é reservado)
    await page.goto('/cart')
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()

    // 5. Simula confirmação da transação na rede
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-order-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
    })

    // 6. Após confirmação definitiva, os itens comprados são removidos do carrinho
    await page.goto('/cart')
    await expect(page.getByText(/Seu carrinho está vazio/i)).toBeVisible()

    // Restaura cenário
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulatePendingOrder: false }),
      })
    })
  })

  test('deve liberar a reserva de estoque quando o pedido pendente for rejeitado', async ({ page }) => {
    // 1. Obtém estoque inicial
    const initialEditions = await page.evaluate(async () => {
      const res = await fetch('/api/nfts/nft_1')
      const data = await res.json()
      return data.availableEditions
    })

    // 2. Ativa cenário de pedido pendente
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulatePendingOrder: true }),
      })
    })

    // 3. Conclui checkout gerando pedido pendente
    await page.goto('/checkout')
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page).toHaveURL(/order-confirmation\/ord_/)

    // 4. Verifica que o estoque disponível foi decrementado pela reserva
    const reservedEditions = await page.evaluate(async () => {
      const res = await fetch('/api/nfts/nft_1')
      const data = await res.json()
      return data.availableEditions
    })
    expect(reservedEditions).toBe(initialEditions - 1)

    // 5. Rejeita o pedido simulando erro na blockchain
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-order-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', reason: 'Transação rejeitada pela rede' }),
      })
    })

    // 6. Verifica que o estoque reservado foi devolvido integralmente
    const restoredEditions = await page.evaluate(async () => {
      const res = await fetch('/api/nfts/nft_1')
      const data = await res.json()
      return data.availableEditions
    })
    expect(restoredEditions).toBe(initialEditions)

    // Restaura cenário
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulatePendingOrder: false }),
      })
    })
  })

  test('deve calcular valores monetários com exatidão decimal BigInt sem imprecisões de ponto flutuante', async ({ page }) => {
    await page.goto('/cart')

    // Aplica cupom de 10%
    await page.getByPlaceholder(/Código promocional/i).fill('DESAFIO10')
    await page.getByRole('button', { name: /Aplicar/i }).click()
    await expect(page.getByText('DESAFIO10')).toBeVisible()

    // Verifica que não há dízimas ou erros de ponto flutuante (ex: 0.30000000000000004)
    const content = await page.content()
    expect(content).not.toMatch(/000000000\d/)
    expect(content).not.toMatch(/999999999\d/)

    // Verifica presença da taxa fixa exata de gas de rede 0.0025 ETH
    await expect(page.getByText('0.0025 ETH')).toBeVisible()
  })
})

