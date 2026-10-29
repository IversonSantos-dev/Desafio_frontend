/**
 * Utilitário de aritmética decimal exata para manipulação de valores em ETH.
 * Utiliza BigInt com fator de escala de 10^18 (equivalente ao Wei na rede Ethereum),
 * eliminando imprecisões e erros de arredondamento de ponto flutuante (parseFloat/Number).
 */

const DECIMALS = 18
const SCALE = 10n ** BigInt(DECIMALS)

/**
 * Converte uma string ou número decimal para BigInt na escala de 18 decimais.
 */
export function parseDecimalToBigInt(value: string | number): bigint {
  const str = String(value).trim()
  if (!str) return 0n

  const isNegative = str.startsWith('-')
  const cleanStr = isNegative ? str.slice(1) : str

  const parts = cleanStr.split('.')
  const integerPart = parts[0] || '0'
  const fractionalPart = (parts[1] || '').padEnd(DECIMALS, '0').slice(0, DECIMALS)

  const combined = BigInt(integerPart) * SCALE + BigInt(fractionalPart)
  return isNegative ? -combined : combined
}

/**
 * Converte um BigInt na escala de 18 decimais para string decimal formatada.
 */
export function formatBigIntToDecimal(
  value: bigint,
  minDecimals = 4,
  maxDecimals = 4,
): string {
  const isNegative = value < 0n
  const absValue = isNegative ? -value : value

  const integerPart = absValue / SCALE
  const fractionalPart = (absValue % SCALE).toString().padStart(DECIMALS, '0')

  // Trunca para maxDecimals
  let truncated = fractionalPart.slice(0, maxDecimals)

  // Assegura pelo menos minDecimals
  if (truncated.length < minDecimals) {
    truncated = truncated.padEnd(minDecimals, '0')
  }

  const prefix = isNegative ? '-' : ''
  return `${prefix}${integerPart.toString()}.${truncated}`
}

/**
 * Soma dois valores decimais em ETH.
 */
export function decimalAdd(a: string | number, b: string | number): string {
  const bigA = parseDecimalToBigInt(a)
  const bigB = parseDecimalToBigInt(b)
  return formatBigIntToDecimal(bigA + bigB)
}

/**
 * Subtrai b de a (a - b) com precisão exata.
 */
export function decimalSubtract(a: string | number, b: string | number): string {
  const bigA = parseDecimalToBigInt(a)
  const bigB = parseDecimalToBigInt(b)
  const diff = bigA - bigB
  return formatBigIntToDecimal(diff < 0n ? 0n : diff)
}

/**
 * Multiplica um valor unitário em ETH por uma quantidade inteira.
 */
export function decimalMultiply(unitPrice: string | number, quantity: number): string {
  const bigPrice = parseDecimalToBigInt(unitPrice)
  const bigQty = BigInt(Math.max(0, Math.floor(quantity)))
  return formatBigIntToDecimal(bigPrice * bigQty)
}

/**
 * Aplica um percentual de desconto sobre um valor (ex: 10% sobre 1.5 ETH).
 */
export function decimalPercentage(amount: string | number, percentage: number): string {
  const bigAmount = parseDecimalToBigInt(amount)
  const bigPercent = BigInt(Math.max(0, Math.floor(percentage)))
  const discount = (bigAmount * bigPercent) / 100n
  return formatBigIntToDecimal(discount)
}

/**
 * Compara dois valores decimais.
 * Retorna -1 se a < b, 0 se a === b, 1 se a > b.
 */
export function decimalCompare(a: string | number, b: string | number): number {
  const bigA = parseDecimalToBigInt(a)
  const bigB = parseDecimalToBigInt(b)
  if (bigA < bigB) return -1
  if (bigA > bigB) return 1
  return 0
}

/**
 * Verifica se dois valores decimais são exatamente iguais.
 */
export function decimalEquals(a: string | number, b: string | number): boolean {
  return decimalCompare(a, b) === 0
}

/**
 * Formata um valor de ETH para exibição com número fixo de decimais (padrão: 4 decimais).
 */
export function formatETH(value: string | number, decimals = 4): string {
  const bigVal = parseDecimalToBigInt(value)
  return formatBigIntToDecimal(bigVal, decimals, decimals)
}

/**
 * Multiplica preço unitário por quantidade e formata como string decimal exata.
 */
export function multiplyUnitPrice(unitPrice: string | number, quantity: number, decimals = 4): string {
  const bigPrice = parseDecimalToBigInt(unitPrice)
  const bigQty = BigInt(Math.max(0, Math.floor(quantity)))
  return formatBigIntToDecimal(bigPrice * bigQty, decimals, decimals)
}
