import React, { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '@/contracts'
import { api } from '@/lib/axios'
import { queryClient } from '@/lib/query-client'
import { resetSocketState } from '@/lib/socket-context'
import { authApi } from '../api/auth.api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  loginWithSocial: (provider: 'google' | 'facebook') => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Recupera sessão no mount (F5)
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('nft_market_token')
      if (token) {
        try {
          const me = await authApi.getMe()
          setUser(me)
        } catch {
          localStorage.removeItem('nft_market_token')
          setUser(null)
        }
      }
      setIsLoading(false)
    }

    void initAuth()

    const handleSessionExpired = () => {
      // Preserva o contexto de rota e parâmetros para retomar após reautenticação
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        sessionStorage.setItem(
          'nft_market_session_resume',
          window.location.pathname + window.location.search,
        )
      }
      localStorage.removeItem('nft_market_token')
      setUser(null)
      queryClient.clear()
      resetSocketState()
      toast.error('Sua sessão expirou. Faça login novamente.')
    }

    window.addEventListener('nft_market:session_expired', handleSessionExpired)
    return () => {
      window.removeEventListener('nft_market:session_expired', handleSessionExpired)
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      const res = await authApi.login(credentials)
      localStorage.setItem('nft_market_token', res.token)
      setUser(res.user)
      queryClient.clear()
      resetSocketState()
      toast.success(`Bem-vindo de volta, ${res.user.name}!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação'
      toast.error(msg)
      throw err
    }
  }

  const register = async (credentials: RegisterCredentials) => {
    try {
      const res = await authApi.register(credentials)
      localStorage.setItem('nft_market_token', res.token)
      setUser(res.user)
      queryClient.clear()
      resetSocketState()
      toast.success(`Conta criada com sucesso! Bem-vindo, ${res.user.name}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no cadastro'
      toast.error(msg)
      throw err
    }
  }

  const loginWithSocial = async (provider: 'google' | 'facebook') => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/social', { provider })
      localStorage.setItem('nft_market_token', data.token)
      setUser(data.user)
      queryClient.clear()
      resetSocketState()
      const providerName = provider === 'google' ? 'Google' : 'Facebook'
      toast.success(`Autenticado com ${providerName}! Bem-vindo, ${data.user.name}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no login social'
      toast.error(msg)
      throw err
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignora erro de rede em logout
    }
    localStorage.removeItem('nft_market_token')
    sessionStorage.removeItem('nft_market_session_resume')
    // Remove dados e sessões de checkout privados do usuário anterior
    if (typeof window !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('nft_market_checkout_session_')) {
          sessionStorage.removeItem(key)
        }
      })
    }
    setUser(null)
    queryClient.clear()
    resetSocketState()
    toast.info('Você saiu da sua conta.')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithSocial,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
