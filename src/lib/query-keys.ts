export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  nfts: {
    all: ['nfts'] as const,
    list: (filters: Record<string, unknown>) => ['nfts', 'list', filters] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },
  favorites: {
    all: (userId: string) => ['favorites', userId] as const,
    details: (userId: string) => ['favorites', 'details', userId] as const,
  },
  cart: {
    user: (userId: string) => ['cart', userId] as const,
    quote: (userId: string) => ['cart', 'quote', userId] as const,
  },
  orders: {
    list: (userId: string) => ['orders', 'list', userId] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  wallets: {
    list: (userId: string) => ['wallets', userId] as const,
  },
  profile: {
    user: (userId: string) => ['profile', userId] as const,
  },
}
