export interface MockCoupon {
  code: string
  discountPercentage: number
  expiresAt: string
  active: boolean
}

export const INITIAL_COUPONS: MockCoupon[] = [
  {
    code: 'DESAFIO10',
    discountPercentage: 10,
    expiresAt: '2030-12-31T23:59:59Z',
    active: true,
  },
  {
    code: 'NFT20',
    discountPercentage: 20,
    expiresAt: '2030-12-31T23:59:59Z',
    active: true,
  },
  {
    code: 'EXPIRED50',
    discountPercentage: 50,
    expiresAt: '2024-01-01T00:00:00Z', // Expirado
    active: true,
  },
]
