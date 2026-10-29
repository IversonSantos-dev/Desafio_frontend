import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('Regressão Visual (Início, Detalhe, Carrinho e Pagamento)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Reseta o banco simulado para garantir dados estáveis e consistentes
    await page.goto('/')
    await page.evaluate(async () => {
      await fetch('/api/mock/reset', { method: 'POST' })
    })
  })

  test('regressão visual da página inicial (Catálogo)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Neon Drift #300')).toBeVisible()

    // Aguarda rede estabilizar
    await page.waitForLoadState('networkidle')

    // Captura screenshot da viewport
    await expect(page).toHaveScreenshot('home-catalog.png', {
      fullPage: false,
    })
  })

  test('regressão visual da página de detalhes do NFT', async ({ page }) => {
    await page.goto('/nft/nft_1')
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('nft-detail.png', {
      fullPage: false,
    })
  })

  test('regressão visual do carrinho de compras', async ({ page }) => {
    // Adiciona item estável ao carrinho
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    await page.goto('/cart')
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('cart-page.png', {
      fullPage: false,
    })
  })

  test('regressão visual da tela de pagamento (Checkout)', async ({ page }) => {
    // Login com Satoshi Nakamoto
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    // Adiciona item ao carrinho
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // Acessa tela de checkout
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: /Pagamento/i })).toBeVisible()
    await expect(page.getByText('MetaMask Principal')).toBeVisible()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('checkout-page.png', {
      fullPage: false,
    })
  })
})
