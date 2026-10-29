import { api } from '@/lib/axios'
import type { NFT } from '@/contracts'

export const favoritesApi = {
  list: async (): Promise<string[]> => {
    const { data } = await api.get<string[]>('/favorites')
    return data
  },

  listNFTs: async (): Promise<NFT[]> => {
    const { data } = await api.get<NFT[]>('/favorites/details')
    return data
  },

  toggle: async (nftId: string): Promise<{ nftId: string; isFavorite: boolean }> => {
    const { data } = await api.post<{ nftId: string; isFavorite: boolean }>(`/favorites/${nftId}`)
    return data
  },
}
