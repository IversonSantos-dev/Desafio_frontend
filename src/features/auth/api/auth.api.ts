import { api } from '@/lib/axios'
import type {
  AuthResponse,
  ChangePasswordInput,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '@/contracts'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', credentials)
    return data
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  logout: async (): Promise<{ success: boolean }> => {
    const { data } = await api.post<{ success: boolean }>('/auth/logout')
    return data
  },

  changePassword: async (input: ChangePasswordInput): Promise<{ success: boolean }> => {
    const { data } = await api.put<{ success: boolean }>('/auth/password', input)
    return data
  },
}
