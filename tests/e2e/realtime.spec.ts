import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('10. Tempo Real (Socket.IO), Descarte de Eventos Obsoletos e Reconexão (Cenários 9 e 10)', () => {
  test.beforeEach(async ({ page }) => {
    // Reseta banco e cenários antes de cada teste
    await page.goto('/')
    await page.evaluate(async () => {
      await fetch('/api/mock/reset', { method: 'POST' })
    })
  })

  test('deve alertar o usuário quando o preço de um item no carrinho for alterado em tempo real', async ({ page }) => {
    // 1. Adiciona NFT ao carrinho
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // 2. Abre a página do carrinho
    await page.goto('/cart')
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()

    // 3. Aguarda conexão ativa do socket
    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // 4. Simula evento nft.updated em tempo real via WebSocket MSW / Socket.IO
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nftId: 'nft_1',
          price: '2.50',
          availableEditions: 2,
        }),
      })
    })

    // 5. Verifica se o alerta ou toast de atualização em tempo real apareceu
    await expect(page.getByText(/Preço atualizado em tempo real para 2.50 ETH/i).first()).toBeVisible()

    // 6. Verifica se o preço foi atualizado na página do carrinho
    await expect(page.getByText(/2.50 ETH/i).first()).toBeVisible()
  })

  test('deve descartar eventos nft.updated com versão antiga sem regredir preço nem emitir alerta indevido', async ({ page }) => {
    // 1. Adiciona NFT 2 ao carrinho
    await page.goto('/nft/nft_2')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // 2. Abre a página do carrinho
    await page.goto('/cart')
    await expect(page.getByText('Ethereal Nebula #42')).toBeVisible()

    // 3. Aguarda conexão ativa do socket
    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // 4. Atualiza para versão mais recente (preço 1.85 ETH, versão incrementada)
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nftId: 'nft_2',
          price: '1.85',
          availableEditions: 1,
        }),
      })
    })
    await expect(page.getByText(/1.85 ETH/i).first()).toBeVisible()

    // 5. Emite evento antigo com versão 1 e preço 0.50 ETH via trigger-raw-event
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-raw-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'nft.updated',
          payload: {
            nftId: 'nft_2',
            price: '0.50',
            availableEditions: 1,
            version: 1, // Versão obsoleta (anterior à atual versão 2)
            updatedAt: new Date(Date.now() - 10000).toISOString(),
          },
        }),
      })
    })

    // 6. Aguarda propagação e valida que o preço NÃO regrediu e nenhum alerta de 0.50 ETH foi exibido
    await page.waitForTimeout(1000)
    await expect(page.locator('text=0.50 ETH')).toHaveCount(0)
    await expect(page.getByText(/1.85 ETH/i).first()).toBeVisible()
  })

  test('deve suportar desconexão e reconexão do socket sincronizando com o estado REST', async ({ page }) => {
    // 1. Adiciona NFT 3 ao carrinho
    await page.goto('/nft/nft_3')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // 2. Abre a página do carrinho
    await page.goto('/cart')
    await expect(page.getByText('Neon Phantom #108')).toBeVisible()
    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // 3. Desconecta intencionalmente o socket
    await page.evaluate(() => {
      ;(window as any).__socketClient?.disconnect()
    })
    await page.waitForFunction(() => (window as any).__socketConnected === false, null, { timeout: 5000 })

    // 4. Reconecta o socket
    await page.evaluate(() => {
      ;(window as any).__socketClient?.connect()
    })
    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // 5. Envia atualização de preço pós-reconexão para confirmar que os listeners estão ativos
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nftId: 'nft_3',
          price: '0.99',
          availableEditions: 15,
        }),
      })
    })

    await expect(page.getByText(/Preço atualizado em tempo real para 0.99 ETH/i).first()).toBeVisible()
    await expect(page.getByText(/0.99 ETH/i).first()).toBeVisible()
  })

  test('deve recuperar pedido pendente e atualizar em tempo real para confirmado via order.updated', async ({ page }) => {
    // 1. Login com Satoshi
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    // 2. Adiciona item ao carrinho
    await page.goto('/nft/nft_4')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // 3. Configura cenário de pedido inicialmente pendente
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulatePendingOrder: true }),
      })
    })

    // 4. Conclui checkout
    await page.goto('/checkout')
    await page.getByRole('button', { name: /Confirmar compra/i }).click()

    // 5. Redireciona e exibe tela de "Transação Pendente..."
    await expect(page).toHaveURL(/order-confirmation\/ord_/)
    await expect(page.getByRole('heading', { name: /Transação Pendente/i })).toBeVisible()

    // 6. Recarrega a página (F5) para confirmar recuperação via REST após refresh
    await page.reload()
    await expect(page.getByRole('heading', { name: /Transação Pendente/i })).toBeVisible()

    // 7. Aguarda socket ativo e emite order.updated com status confirmed
    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-order-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
    })

    // 8. Deve transicionar em tempo real para Pedido Confirmado!
    await expect(page.getByRole('heading', { name: /Pedido Confirmado!/i })).toBeVisible()
    await expect(page.getByText(/Hash da Transação/i)).toBeVisible()
  })

  test('deve tolerar múltiplos eventos fora de ordem (versões 3 -> 2 -> 5 -> 1) preservando o preço mais recente', async ({ page }) => {
    // 1. Abre detalhe do NFT 1
    await page.goto('/nft/nft_1')
    await expect(page.getByRole('heading', { name: 'Cyber Samurai #001' })).toBeVisible()
    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // 2. Dispara Versão 3 com preço 4.50 ETH
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-raw-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'nft.updated',
          payload: {
            nftId: 'nft_1',
            price: '4.50',
            availableEditions: 3,
            version: 3,
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    })
    await expect(page.getByText('4.50').first()).toBeVisible()

    // 3. Dispara Versão 2 (atrasada / fora de ordem) com preço 1.10 ETH -> deve ser descartada
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-raw-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'nft.updated',
          payload: {
            nftId: 'nft_1',
            price: '1.10',
            availableEditions: 3,
            version: 2,
            updatedAt: new Date(Date.now() - 5000).toISOString(),
          },
        }),
      })
    })
    // Preço deve permanecer 4.50 e não regredir para 1.10
    await page.waitForTimeout(500)
    await expect(page.getByText('1.10')).toHaveCount(0)
    await expect(page.getByText('4.50').first()).toBeVisible()

    // 4. Dispara Versão 5 com preço 6.00 ETH -> deve ser aceita
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-raw-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'nft.updated',
          payload: {
            nftId: 'nft_1',
            price: '6.00',
            availableEditions: 2,
            version: 5,
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    })
    await expect(page.getByText('6.00').first()).toBeVisible()

    // 5. Dispara Versão 1 (antiga) com preço 0.80 ETH -> deve ser descartada
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-raw-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'nft.updated',
          payload: {
            nftId: 'nft_1',
            price: '0.80',
            availableEditions: 3,
            version: 1,
            updatedAt: new Date(Date.now() - 10000).toISOString(),
          },
        }),
      })
    })
    await page.waitForTimeout(500)
    await expect(page.getByText('0.80')).toHaveCount(0)
    await expect(page.getByText('6.00').first()).toBeVisible()
  })

  test('deve isolar eventos order.updated descartando eventos direcionados a outros usuários', async ({ page }) => {
    // 1. Login com Satoshi (user_1)
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // 2. Dispara evento order.updated cujo userId pertence à Elena (user_2)
    await page.evaluate(async () => {
      await fetch('/api/mock/trigger-raw-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.updated',
          payload: {
            orderId: 'ord_elena_test',
            userId: 'user_2',
            status: 'confirmed',
            transactionHash: '0xElenaSecretHash',
            version: 2,
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    })

    // 3. Aguarda propagação e verifica que não afetou o estado do Satoshi
    await page.waitForTimeout(500)
    const pageContent = await page.content()
    expect(pageContent).not.toContain('0xElenaSecretHash')
  })

  test('deve impedir regressão de pedido confirmado para pendente ou rejeitado via socket', async ({ page }) => {
    // 1. Login com Satoshi
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    // 2. Cria pedido confirmado
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()
    await page.goto('/checkout')
    await page.getByRole('button', { name: /Confirmar/i }).click()
    await expect(page).toHaveURL(/order-confirmation\/ord_/)
    await expect(page.getByRole('heading', { name: 'Pedido Confirmado!' })).toBeVisible()

    const orderId = page.url().split('/').pop()!

    await page.waitForFunction(() => (window as any).__socketConnected === true, null, { timeout: 10000 })

    // 3. Tenta forçar regressão de 'confirmed' para 'pending' via raw socket
    await page.evaluate(async (id) => {
      await fetch('/api/mock/trigger-raw-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.updated',
          payload: {
            orderId: id,
            userId: 'user_1',
            status: 'pending',
            version: 99,
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    }, orderId)

    // 4. Aguarda e valida que a tela permanece 'Pedido Confirmado!' e não regrediu
    await page.waitForTimeout(500)
    await expect(page.getByRole('heading', { name: 'Pedido Confirmado!' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Transação Pendente/i })).toHaveCount(0)
  })
})

