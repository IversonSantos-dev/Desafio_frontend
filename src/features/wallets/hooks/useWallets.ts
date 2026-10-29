import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CreateWalletInput, UpdateWalletInput } from '@/contracts'
import { useAuth } from '@/features/auth/context/AuthContext'
import { queryKeys } from '@/lib/query-keys'
import { walletsApi } from '../api/wallets.api'

export function useWallets() {
  const { user } = useAuth()
  const userId = user?.id || ''

  return useQuery({
    queryKey: queryKeys.wallets.list(userId),
    queryFn: () => walletsApi.list(),
    enabled: !!userId,
  })
}

export function useAddWallet() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id || ''

  return useMutation({
    mutationFn: (input: CreateWalletInput) => walletsApi.add(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.list(userId) })
      toast.success('Nova carteira cadastrada com sucesso!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao cadastrar carteira.')
    },
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id || ''

  return useMutation({
    mutationFn: (input: UpdateWalletInput) => walletsApi.update(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets.list(userId) })
      toast.success('Carteira atualizada!')
    },
  })
}
