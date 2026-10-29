import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('12. Resiliência de Rede, Skeletons e Recuperação de Falhas (Cenário 12)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => {
      await fetch('/api/mock/reset', { method: 'POST' })
    })
  })

  test.afterEach(async ({ page }) => {
    // Garante restauração de cenários saudáveis
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latencyMs: 150, forceStatus: null, simulateOffline: false }),
      })
    })
  })

  test('deve exibir skeletons com shimmer durante carregamento com alta latência', async ({ page }) => {
    // 1. Abre o catálogo inicial
    await page.goto('/')
    await expect(page.getByText('Neon Drift #300')).toBeVisible()

    // 2. Configura latência simulada de 1500ms no MSW
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latencyMs: 1500, forceStatus: null }),
      })
    })

    // 3. Altera ordenação para disparar carregamento com latência
    const sortSelect = page.getByLabel('Ordenar por')
    await sortSelect.selectOption('price_asc')

    // 4. Valida que os skeletons são renderizados durante o carregamento
    const skeleton = page.locator('[data-testid="skeleton"]').first()
    await expect(skeleton).toBeVisible()

    // 5. Aguarda conclusão do carregamento e remoção dos skeletons
    await expect(skeleton).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/ETH/i).first()).toBeVisible()
  })

  test('deve exibir feedback de erro 500 no catálogo e recuperar dados após clicar em Tentar Novamente', async ({ page }) => {
    // 1. Abre a página inicial
    await page.goto('/')
    await expect(page.getByText('Neon Drift #300')).toBeVisible()

    // 2. Injeta erro 500 na camada de rede MSW
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: 500, latencyMs: 0 }),
      })
    })

    // 3. Altera filtro de coleção para disparar nova consulta REST imediata
    const collectionSelect = page.getByLabel('Filtrar por Coleção')
    await collectionSelect.selectOption('Cyber Punks')

    // 4. Valida exibição do card de erro com botão de retry
    const errorCard = page.locator('[data-testid="catalog-error"]')
    await expect(errorCard).toBeVisible()
    await expect(page.getByText(/Falha ao carregar catálogo/i)).toBeVisible()

    const retryButton = page.getByRole('button', { name: /Tentar Novamente/i })
    await expect(retryButton).toBeVisible()

    // 5. Restaura o status normal da API simulada
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: null }),
      })
    })

    // 6. Clica em Tentar Novamente e valida recuperação dos dados
    await retryButton.click()
    await expect(errorCard).not.toBeVisible()
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()
  })

  test('deve exibir feedback de falha no carrinho e recuperar dados após nova tentativa', async ({ page }) => {
    // 1. Adiciona NFT ao carrinho em estado normal
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // 2. Abre a página do carrinho
    await page.goto('/cart')
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()

    // 3. Simula falha HTTP 500 na API
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: 500 }),
      })
    })

    // 4. Recarrega a página sob falha 500
    await page.reload()
    const cartErrorCard = page.locator('[data-testid="cart-error"]')
    await expect(cartErrorCard).toBeVisible()
    await expect(page.getByText(/Falha ao carregar o carrinho/i)).toBeVisible()

    // 5. Restaura estado saudável da API
    await page.evaluate(async () => {
      await fetch('/api/mock/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceStatus: null }),
      })
    })

    // 6. Clica em Tentar Novamente e confirma recuperação dos itens
    await page.getByRole('button', { name: /Tentar Novamente/i }).click()
    await expect(cartErrorCard).not.toBeVisible()
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()
  })
})
