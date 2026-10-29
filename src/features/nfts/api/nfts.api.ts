import { api } from '@/lib/axios'
import type { NFT, NFTFilters, NFTListResponse } from '@/contracts'

export const nftsApi = {
  list: async (filters?: Partial<NFTFilters>): Promise<NFTListResponse> => {
    const { data } = await api.get<NFTListResponse>('/nfts', { params: filters })
    return data
  },

  getById: async (id: string): Promise<NFT> => {
    const { data } = await api.get<NFT>(`/nfts/${id}`)
    return data
  },
}
