import type { User } from '@/contracts'

export interface MockUserAccount extends User {
  passwordHash: string
  wallets: string[]
}

/**
 * Gera um hash simulado e irreversível que não preserva a senha original
 * e explicita que se trata de uma representação de mock para testes e demonstração.
 */
export function mockHashPassword(plainPassword: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < plainPassword.length; i++) {
    hash ^= plainPassword.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  return `mock_argon2id$v=19$m=65536,t=3,p=4$simulated_salt_${hex.slice(0, 4)}$${hex}`
}

/**
 * Valida a senha contra o hash simulado.
 */
export function verifyMockPassword(plainPassword: string, storedHash: string): boolean {
  if (!storedHash) return false
  return mockHashPassword(plainPassword) === storedHash
}

export const INITIAL_USERS: MockUserAccount[] = [
  {
    id: 'user_1',
    name: 'Satoshi Nakamoto',
    email: 'satoshi@nftmarket.dev',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Colecionador pioneiro de arte digital e entusiasta Web3.',
    passwordHash: mockHashPassword('password123'),
    wallets: ['wallet_1', 'wallet_2'],
    createdAt: '2025-01-10T12:00:00Z',
  },
  {
    id: 'user_2',
    name: 'Elena Rostova',
    email: 'elena@nftmarket.dev',
    avatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    bio: 'Curadora e artista generativa 3D.',
    passwordHash: mockHashPassword('password123'),
    wallets: ['wallet_3'],
    createdAt: '2025-02-15T10:00:00Z',
  },
]
