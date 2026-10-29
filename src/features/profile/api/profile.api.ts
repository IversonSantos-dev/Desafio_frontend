import { api } from '@/lib/axios'
import type { User } from '@/contracts'

export interface UpdateProfileInput {
  name?: string
  bio?: string
  avatar?: string
}

export const profileApi = {
  get: async (): Promise<User> => {
    const { data } = await api.get<User>('/profile')
    return data
  },

  update: async (input: UpdateProfileInput): Promise<User> => {
    const { data } = await api.patch<User>('/profile', input)
    return data
  },
}
