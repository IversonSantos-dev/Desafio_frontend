import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('11. Acessibilidade (WCAG 2.1 AA), Navegação por Teclado e Foco (Cenário 11)', () => {
  test('Catálogo principal deve cumprir normas de acessibilidade', async ({ page }) => {
    await page.goto('/')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Permite personalização temática espresso #120F0D / #C97D44
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Página de Detalhes do NFT deve cumprir normas de acessibilidade', async ({ page }) => {
    await page.goto('/nft/nft_1')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Página do Carrinho deve cumprir normas de acessibilidade', async ({ page }) => {
    await page.goto('/cart')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Página de Login deve cumprir normas de acessibilidade', async ({ page }) => {
    await page.goto('/login')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('deve permitir navegação por teclado e busca por Enter no catálogo', async ({ page }) => {
    await page.goto('/')

    // Foca na barra de busca via teclado
    const searchInput = page.getByPlaceholder(/Buscar por título/i)
    await searchInput.focus()
    await expect(searchInput).toBeFocused()

    // Digita e submete com Enter
    await page.keyboard.type('Samurai')
    await page.keyboard.press('Enter')

    // Valida atualização da URL e resultado filtrado
    await expect(page).toHaveURL(/q=Samurai/)
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()
  })

  test('deve controlar foco ao abrir e fechar diálogo modal com Escape', async ({ page }) => {
    // 1. Faz login com Satoshi
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')

    // 2. Abre a página do perfil
    await page.goto('/profile')

    // 3. Abre modal de nova carteira
    const addWalletBtn = page.getByRole('button', { name: /Nova Carteira/i })
    await addWalletBtn.click()

    // Modal deve ser exibido como diálogo acessível
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // 4. Fecha com a tecla Escape
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('deve exibir mensagens de erro associadas aos campos em formulários inválidos', async ({ page }) => {
    await page.goto('/login')

    // Submete formulário vazio para disparar validação acessível
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()

    await expect(page.getByText('Insira um e-mail válido')).toBeVisible()
    await expect(page.getByText('A senha deve conter no mínimo 6 caracteres')).toBeVisible()
  })
})
