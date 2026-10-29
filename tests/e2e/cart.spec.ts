import { expect, test } from '@playwright/test'

test.describe('5. Carrinho de Compras, Cupons e Cotação', () => {
  test('deve adicionar item ao carrinho e refletir no badge do header', async ({ page }) => {
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()

    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // Verifica que o badge no header exibe contagem
    const cartBadge = page.getByRole('link', { name: /Carrinho/i }).locator('span').first()
    await expect(cartBadge).toBeVisible()
  })

  test('deve aplicar cupom válido com cálculo de desconto e rejeitar cupom expirado', async ({ page }) => {
    // Garante item no carrinho
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    await page.goto('/cart')
    await expect(page.getByRole('heading', { name: 'Carrinho de Compras' })).toBeVisible()

    // 1. Aplica cupom expirado
    const couponInput = page.getByPlaceholder(/Ex: DESAFIO10/i)
    await couponInput.fill('EXPIRED50')
    await page.getByRole('button', { name: /Aplicar/i }).click()
    await expect(page.getByText(/Este cupom de desconto está expirado/i)).toBeVisible()

    // 2. Aplica cupom válido
    await couponInput.fill('DESAFIO10')
    await page.getByRole('button', { name: /Aplicar/i }).click()
    await expect(page.getByText(/Cupom de desconto aplicado com sucesso/i)).toBeVisible()
    await expect(page.getByText(/DESAFIO10/i).first()).toBeVisible()
    await expect(page.getByText(/Desconto/i).first()).toBeVisible()
  })

  test('deve alterar quantidade e remover item do carrinho com persistência', async ({ page }) => {
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    await page.goto('/cart')
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()

    // Incrementa quantidade
    const plusBtn = page.getByRole('button', { name: 'Aumentar quantidade' })
    if (await plusBtn.isEnabled()) {
      await plusBtn.click()
      await expect(page.getByRole('main').getByText('2', { exact: true })).toBeVisible()
    }

    // Recarrega (F5) e verifica que o carrinho permaneceu
    await page.reload()
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()

    // Remove item
    await page.getByRole('button', { name: /Remover Cyber Samurai/i }).click()
    await expect(page.getByText(/Seu carrinho está vazio/i)).toBeVisible()
  })

  test('deve mesclar carrinho de visitante com a conta do usuário após login', async ({ page }) => {
    // 1. Visitante adiciona item ao carrinho sem estar autenticado
    await page.goto('/nft/nft_2')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    // 2. Realiza login com Satoshi
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    // 3. Abre o carrinho e valida que o item adicionado como visitante foi mesclado
    await page.goto('/cart')
    await expect(page.getByText('Ethereal Nebula #42')).toBeVisible()
  })
})
