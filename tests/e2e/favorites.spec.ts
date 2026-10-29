import { expect, test } from '@playwright/test'

test.describe('4. Favoritos e Atualizações Otimistas', () => {
  test.describe('Operações com usuário autenticado', () => {
    test.beforeEach(async ({ page }) => {
      // Realiza login com Satoshi
      await page.goto('/login')
      await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
      await page.getByLabel('Senha').fill('password123')
      await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
      await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i })).toBeVisible()
    })

    test('deve alternar favorito de forma otimista e persistir', async ({ page }) => {
      await page.goto('/')

      // Neon Drift #300 é o primeiro card do catálogo na ordenação padrão e não está nos favoritos iniciais
      const addFavBtn = page.getByRole('button', { name: 'Adicionar Neon Drift #300 aos favoritos' })
      const removeFavBtn = page.getByRole('button', { name: 'Remover Neon Drift #300 dos favoritos' })

      await expect(addFavBtn).toBeVisible()

      // 1. Adiciona aos favoritos de forma otimista e aguarda confirmação de rede antes do reload
      const addResponsePromise = page.waitForResponse(
        (res) => res.url().includes('/api/favorites/nft_12') && res.status() === 200,
      )
      await addFavBtn.click()
      // O estado visual atualiza imediatamente (otimista)
      await expect(removeFavBtn).toBeVisible()
      await addResponsePromise

      // 2. Recarrega a página (F5) e valida persistência no backend/MSW
      await page.reload()
      await expect(removeFavBtn).toBeVisible()

      // 3. Remove dos favoritos de forma otimista e aguarda rede
      const removeResponsePromise = page.waitForResponse(
        (res) => res.url().includes('/api/favorites/nft_12') && res.status() === 200,
      )
      await removeFavBtn.click()
      await expect(addFavBtn).toBeVisible()
      await removeResponsePromise

      // 4. Recarrega e valida que a remoção persistiu
      await page.reload()
      await expect(addFavBtn).toBeVisible()
    })

    test('deve realizar rollback otimista e exibir toast de erro quando a API retornar 500', async ({ page }) => {
      await page.goto('/')

      // Garante que o catálogo carregou antes de injetar a simulação de falha
      const addFavBtn = page.getByRole('button', { name: 'Adicionar Neon Drift #300 aos favoritos' })
      await expect(addFavBtn).toBeVisible()

      // 1. Simula cenário de erro HTTP 500 via MSW
      await page.evaluate(async () => {
        await fetch('/api/mock/scenario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceStatus: 500 }),
        })
      })

      try {
        // 2. Clica para favoritar Neon Drift #300
        await addFavBtn.click()

        // 3. Verifica feedback de erro e rollback do estado para o original
        await expect(page.getByText(/Falha ao atualizar favoritos/i).first()).toBeVisible()
        await expect(addFavBtn).toBeVisible()
      } finally {
        // 4. Restaura cenário para não contaminar os próximos testes
        await page.evaluate(async () => {
          await fetch('/api/mock/scenario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceStatus: null }),
          })
        })
      }
    })
  })

  test('deve mesclar favoritos de visitante com a conta do usuário após login', async ({ page }) => {
    // 1. Visitante (não autenticado) acessa a página de um NFT e adiciona aos favoritos
    await page.goto('/nft/nft_3')
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/favorites/nft_3') && res.status() === 200,
    )
    await page.getByRole('button', { name: /Adicionar aos favoritos/i }).click()
    await responsePromise
    await expect(page.getByText('Adicionado aos favoritos!')).toBeVisible()

    // 2. Realiza login com Satoshi
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('satoshi@nftmarket.dev')
    await page.getByLabel('Senha').fill('password123')
    await page.getByRole('button', { name: /Entrar na Plataforma/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: /Satoshi Nakamoto/i })).toBeVisible()

    // 3. Acessa a página de favoritos e valida que:
    // a) O NFT favoritado como visitante foi mesclado (Neon Phantom #108)
    // b) Os favoritos prévios do Satoshi permanecem intactos (Cyber Samurai #001)
    await page.goto('/favorites')
    await expect(page.getByRole('heading', { name: /Meus Favoritos/i })).toBeVisible()
    await expect(page.getByText('Neon Phantom #108')).toBeVisible()
    await expect(page.getByText('Cyber Samurai #001')).toBeVisible()

    // 4. Realiza logout e valida que a chave de visitante foi limpa
    const logoutBtn = page.getByRole('button', { name: /Sair da conta/i }).first()
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
    } else {
      await page.goto('/profile')
      await page.getByRole('button', { name: /Sair da conta/i }).first().click()
    }
    await expect(page.getByRole('link', { name: /Conectar/i }).first()).toBeVisible()

    // Como visitante após logout, a lista de favoritos não deve conter o NFT mesclado
    await page.goto('/favorites')
    await expect(page.getByText('Neon Phantom #108')).not.toBeVisible()
  })
})
