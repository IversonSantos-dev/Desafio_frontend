import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/context/AuthContext'
import { queryKeys } from '@/lib/query-keys'
import { favoritesApi } from '../api/favorites.api'

export function useFavorites() {
  const { user } = useAuth()
  const userKey = user?.id || 'guest'

  return useQuery({
    queryKey: queryKeys.favorites.all(userKey),
    queryFn: () => favoritesApi.list(),
  })
}

export function useFavoriteNFTs() {
  const { user } = useAuth()
  const userKey = user?.id || 'guest'

  return useQuery({
    queryKey: queryKeys.favorites.details(userKey),
    queryFn: () => favoritesApi.listNFTs(),
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userKey = user?.id || 'guest'

  return useMutation({
    mutationFn: (nftId: string) => favoritesApi.toggle(nftId),

    // Atualização otimista imediata no cache
    onMutate: async (nftId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites.all(userKey) })
      const previousFavorites =
        queryClient.getQueryData<string[]>(queryKeys.favorites.all(userKey)) || []

      const isFav = previousFavorites.includes(nftId)
      const nextFavorites = isFav
        ? previousFavorites.filter((id) => id !== nftId)
        : [...previousFavorites, nftId]

      queryClient.setQueryData(queryKeys.favorites.all(userKey), nextFavorites)

      if (!isFav) {
        toast.success('Adicionado aos favoritos!')
      } else {
        toast.info('Removido dos favoritos.')
      }

      return { previousFavorites }
    },

    onError: (_err, _nftId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(queryKeys.favorites.all(userKey), context.previousFavorites)
      }
      toast.error('Falha ao atualizar favoritos.')
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(userKey) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.details(userKey) })
    },
  })
}
