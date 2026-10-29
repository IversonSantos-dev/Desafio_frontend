import type { User } from '@/contracts'

export interface MockUserAccount extends User {
  passwordHash: string
  wallets: string[]
}

export const INITIAL_USERS: MockUserAccount[] = [
  {
    id: 'user_1',
    name: 'Satoshi Nakamoto',
    email: 'satoshi@nftmarket.dev',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Colecionador pioneiro de arte digital e entusiasta Web3.',
    passwordHash: 'password123',
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
    passwordHash: 'password123',
    wallets: ['wallet_3'],
    createdAt: '2025-02-15T10:00:00Z',
  },
]
