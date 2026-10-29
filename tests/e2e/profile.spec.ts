import { expect, test } from '@playwright/test'

test.describe('8. Edição de Perfil, Senha e Carteiras (Cenário 8)', () => {
  test.beforeEach(async ({ page }) => {
    // Garante que o banco está limpo e reseta estado
    await page.goto('/')
    await page.evaluate(async () => {
      await fetch('/api/mock/reset', { method: 'POST' })
    })

    // Login com Satoshi Nakamoto
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('deve atualizar nome e biografia do perfil com sucesso e persistir após reload', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: /Perfil do Colecionador/i })).toBeVisible()

    // Atualiza nome e biografia
    const nameInput = page.locator('#name')
    await nameInput.fill('Satoshi N. Nakamoto')

    const bioInput = page.locator('#bio')
    await bioInput.fill('Criador do Bitcoin e colecionador de NFTs Web3 raros.')

    await page.getByRole('button', { name: /Salvar Perfil/i }).click()
    await expect(page.getByText('Perfil atualizado com sucesso!')).toBeVisible()

    // Recarrega a página para validar persistência
    await page.reload()
    await expect(page.locator('#name')).toHaveValue('Satoshi N. Nakamoto')
    await expect(page.locator('#bio')).toHaveValue('Criador do Bitcoin e colecionador de NFTs Web3 raros.')
  })

  test('deve validar alteração de senha com erro de validação Zod e erro 400 de senha atual incorreta', async ({ page }) => {
    await page.goto('/profile')

    // 1. Testa validação de senhas não coincidentes
    await page.locator('#currentPassword').fill('password123')
    await page.locator('#newPassword').fill('senhaForte123')
    await page.locator('#confirmNewPassword').fill('senhaDiferente456')
    await page.getByRole('button', { name: /Atualizar Senha/i }).click()
    await expect(page.getByText('As novas senhas não coincidem')).toBeVisible()

    // 2. Testa validação de tamanho mínimo de nova senha (< 6 caracteres)
    await page.locator('#newPassword').fill('123')
    await page.locator('#confirmNewPassword').fill('123')
    await page.getByRole('button', { name: /Atualizar Senha/i }).click()
    await expect(page.getByText('Nova senha deve ter no mínimo 6 caracteres')).toBeVisible()

    // 3. Testa senha atual incorreta (resposta HTTP 400 da API simulada)
    await page.locator('#currentPassword').fill('senha_errada_incorreta')
    await page.locator('#newPassword').fill('novaSenha123456')
    await page.locator('#confirmNewPassword').fill('novaSenha123456')
    await page.getByRole('button', { name: /Atualizar Senha/i }).click()
    await expect(page.getByText('Senha atual incorreta.')).toBeVisible()
  })

  test('deve validar formulário de nova carteira e cadastrar com sucesso', async ({ page }) => {
    await page.goto('/profile')

    // Abre modal de nova carteira
    await page.getByRole('button', { name: /Nova Carteira/i }).click()
    await expect(page.getByRole('heading', { name: /Conectar Nova Carteira Web3/i })).toBeVisible()

    // Tenta submeter vazio para disparar erros Zod
    await page.locator('#add-wallet-label').fill('')
    await page.locator('#add-wallet-address').fill('0xInvalido')
    await page.getByRole('button', { name: /Cadastrar Carteira/i }).click()

    await expect(page.getByText('Apelido da carteira é obrigatório')).toBeVisible()
    await expect(page.getByText('Endereço hexadecimal de carteira inválido (0x...)')).toBeVisible()

    // Preenche com dados válidos
    await page.locator('#add-wallet-label').fill('Cold Storage Reserva')
    await page.getByRole('button', { name: /Gerar Aleatório/i }).click()
    await expect(page.getByText('Endereço simulado gerado!')).toBeVisible()

    await page.getByRole('button', { name: /Cadastrar Carteira/i }).click()

    // O modal deve fechar e a nova carteira deve constar na listagem
    await expect(page.getByRole('heading', { name: /Conectar Nova Carteira Web3/i })).not.toBeVisible()
    await expect(page.getByText('Cold Storage Reserva')).toBeVisible()
  })

  test('deve editar dados de uma carteira existente', async ({ page }) => {
    await page.goto('/profile')

    // Clica no botão de editar da primeira carteira
    const editBtn = page.getByRole('button', { name: /Editar/i }).first()
    await editBtn.click()

    await expect(page.getByRole('heading', { name: /Editar Dados da Carteira/i })).toBeVisible()

    // Altera o apelido da carteira
    const labelInput = page.locator('#edit-wallet-label')
    await labelInput.fill('MetaMask Atualizada 2026')

    await page.getByRole('button', { name: /Salvar Alterações/i }).click()

    await expect(page.getByText('Dados da carteira atualizados com sucesso!')).toBeVisible()
    await expect(page.getByText('MetaMask Atualizada 2026')).toBeVisible()
  })
})
