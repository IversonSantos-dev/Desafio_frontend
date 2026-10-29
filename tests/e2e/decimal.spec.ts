import { expect, test } from '@playwright/test'
import {
  decimalAdd,
  decimalCompare,
  decimalEquals,
  decimalMultiply,
  decimalPercentage,
  decimalSubtract,
  formatBigIntToDecimal,
  formatETH,
  multiplyUnitPrice,
  parseDecimalToBigInt,
} from '@/lib/decimal'

test.describe('13. Precisão Monetária Decimal Exata (BigInt 18 Decimais)', () => {
  test('deve executar operações aritméticas exatas com decimais fracionários sem perda de precisão', () => {
    // 1. Soma de números fracionários de alta precisão (evita truncamento prematuro)
    const sum1 = decimalAdd('0.00004', '0.00004')
    expect(sum1).toBe('0.00008')

    // 2. Soma de valores decimais que causariam imprecisão binária em ponto flutuante IEEE 754 (0.1 + 0.2 = 0.30000000000000004)
    const sumFloatRisk = decimalAdd('0.1000', '0.2000')
    expect(sumFloatRisk).toBe('0.3000')

    // 3. Subtração exata
    const sub1 = decimalSubtract('1.000000', '0.000001')
    expect(sub1).toBe('0.999999')

    // 4. Multiplicação por quantidade inteira
    const mult1 = decimalMultiply('0.00003', 5)
    expect(mult1).toBe('0.00015')

    const multLarge = multiplyUnitPrice('1.2500', 3)
    expect(multLarge).toBe('3.7500')

    // 5. Cálculo percentual de desconto
    const discount = decimalPercentage('1.5000', 10)
    expect(discount).toBe('0.1500')

    const smallDiscount = decimalPercentage('0.0005', 10)
    expect(smallDiscount).toBe('0.00005')

    // 6. Comparações e igualdades
    expect(decimalCompare('0.0002', '0.0001')).toBe(1)
    expect(decimalCompare('0.0001', '0.0002')).toBe(-1)
    expect(decimalCompare('0.000100', '0.0001')).toBe(0)
    expect(decimalEquals('0.0001', '0.00010000')).toBe(true)

    // 7. Formatação de apresentação com 4 casas decimais fixas
    expect(formatETH('0.5')).toBe('0.5000')
    expect(formatETH('1.234567', 4)).toBe('1.2345')

    // 8. Conversão BigInt de escala Wei (10^18)
    const weiVal = parseDecimalToBigInt('1.000000000000000001')
    expect(weiVal).toBe(1000000000000000001n)
    expect(formatBigIntToDecimal(weiVal, 4, 18)).toBe('1.000000000000000001')
  })

  test('deve manter apresentação e soma consistentes no carrinho com quantidades fracionárias', async ({ page }) => {
    // 1. Adiciona NFT ao carrinho
    await page.goto('/nft/nft_1')
    await page.getByRole('button', { name: /Adicionar ao Carrinho/i }).click()
    await expect(page.getByText('NFT adicionado ao carrinho!')).toBeVisible()

    await page.goto('/cart')

    // Aplica cupom de 10%
    await page.getByPlaceholder(/Código promocional/i).fill('DESAFIO10')
    await page.getByRole('button', { name: /Aplicar/i }).click()
    await expect(page.getByText('DESAFIO10')).toBeVisible()

    // Verifica que não há dízimas ou erros de ponto flutuante (ex: 0.30000000000000004)
    const content = await page.content()
    expect(content).not.toMatch(/000000000\d/)
    expect(content).not.toMatch(/999999999\d/)

    // Verifica integridade da taxa de gas de rede 0.0025 ETH
    await expect(page.getByText('0.0025 ETH')).toBeVisible()

    // Valida no DOM que o total contém 4 casas decimais formatadas perfeitamente
    const totalElement = page.locator('span.text-xl.font-bold.text-\\[\\#D28A4C\\]')
    const totalText = await totalElement.innerText()
    expect(totalText).toMatch(/^\d+\.\d{4} ETH$/)
  })
})
