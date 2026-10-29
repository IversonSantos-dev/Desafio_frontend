import { expect, test } from '@playwright/test'

test.describe('2. Detalhes do NFT e Recursos Inexistentes', () => {
  test('deve carregar detalhes do NFT via acesso direto à URL', async ({ page }) => {
    await page.goto('/nft/nft_1')

    await expect(page.getByRole('heading', { name: 'Cyber Samurai #001' })).toBeVisible()
    await expect(page.getByText('Katsuhiro Neo')).toBeVisible()
    await expect(page.getByText('1.25', { exact: true })).toBeVisible()
    await expect(page.getByText(/Atributos e Propriedades/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Comprar Agora/i })).toBeVisible()
  })

  test('deve exibir tela amigável de erro 404 para NFT inexistente', async ({ page }) => {
    await page.goto('/nft/nft_inexistente_999')

    await expect(page.getByRole('heading', { name: /NFT Não Encontrado/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Voltar ao Catálogo/i })).toBeVisible()
  })

  test('deve indicar edição esgotada para NFT sem estoque disponível', async ({ page }) => {
    // nft_7 possui 0 disponíveis nas fixtures
    await page.goto('/nft/nft_7')

    await expect(page.getByRole('heading', { name: 'Neon Ronin #042' })).toBeVisible()
    await expect(page.getByText(/Esta edição especial foi totalmente adquirida/i)).toBeVisible()
  })
})
