import { useQuery } from '@tanstack/react-query'
import type { NFTFilters } from '@/contracts'
import { queryKeys } from '@/lib/query-keys'
import { nftsApi } from '../api/nfts.api'

export function useNFTList(filters: Partial<NFTFilters> = {}) {
  return useQuery({
    queryKey: queryKeys.nfts.list(filters),
    queryFn: () => nftsApi.list(filters),
  })
}

export function useNFT(id: string) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: () => nftsApi.getById(id),
    enabled: !!id,
  })
}
