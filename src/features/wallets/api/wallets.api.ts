import { api } from '@/lib/axios'
import type { CreateWalletInput, UpdateWalletInput, Wallet } from '@/contracts'

export const walletsApi = {
  list: async (): Promise<Wallet[]> => {
    const { data } = await api.get<Wallet[]>('/wallets')
    return data
  },

  add: async (input: CreateWalletInput): Promise<Wallet> => {
    const { data } = await api.post<Wallet>('/wallets', input)
    return data
  },

  update: async (input: UpdateWalletInput): Promise<Wallet> => {
    const { data } = await api.patch<Wallet>(`/wallets/${input.walletId}`, input)
    return data
  },

  remove: async (walletId: string): Promise<{ success: boolean }> => {
    const { data } = await api.delete<{ success: boolean }>(`/wallets/${walletId}`)
    return data
  },
}
