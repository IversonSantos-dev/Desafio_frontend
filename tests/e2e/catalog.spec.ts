import { expect, test } from '@playwright/test'

test.describe('1. Catálogo e Filtros de NFTs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('deve renderizar a tela inicial com catálogo de NFTs', async ({ page }) => {
    await expect(page).toHaveTitle(/NFT Marketplace/i)
    await expect(page.getByRole('heading', { name: /Descubra, Negocie e Colecione/i })).toBeVisible()
    await expect(page.getByText('Neon Drift #300')).toBeVisible()
  })

  test('deve filtrar catálogo por busca com debounce', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por título/i)
    await searchInput.fill('Samurai')

    // Verifica que a URL foi atualizada com o parâmetro q
    await expect(page).toHaveURL(/q=Samurai/)
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()
    await expect(page.getByText('Ethereal Nebula #42')).not.toBeVisible()
  })

  test('deve combinar filtros de coleção e ordenação e restaurar pelo histórico (Back/Forward)', async ({ page }) => {
    // 1. Filtra por Coleção
    const collectionSelect = page.getByLabel('Filtrar por Coleção')
    await collectionSelect.selectOption('Cyber Punks')
    await expect(page).toHaveURL(/collection=Cyber\+Punks/)

    // 2. Altera ordenação para menor preço
    const sortSelect = page.getByLabel('Ordenar por')
    await sortSelect.selectOption('price_asc')
    await expect(page).toHaveURL(/sort=price_asc/)

    // 3. Testa navegação de histórico: voltar
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=price_asc/)

    // 4. Testa avançar no histórico
    await page.goForward()
    await expect(page).toHaveURL(/sort=price_asc/)
  })

  test('deve navegar pelas páginas do catálogo mantendo os filtros', async ({ page }) => {
    // O catálogo possui 12 NFTs com limite de 8 por página (2 páginas)
    const nextBtn = page.getByRole('button', { name: /Próxima/i })
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await expect(page).toHaveURL(/page=2/)
      await expect(page.getByText(/Página 2 de 2/i)).toBeVisible()

      // Volta para página 1
      await page.getByRole('button', { name: /Anterior/i }).click()
      await expect(page).toHaveURL(/page=1/)
    }
  })
})
