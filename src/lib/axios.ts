import axios, { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de requisição: injeta token de autenticação se disponível
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nft_market_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de resposta: tratamento de expiração de sessão (401) e erros de rede
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string }>) => {
    if (error.response?.status === 401) {
      // Dispara evento de sessão expirada para tratamento limpo pela aplicação
      window.dispatchEvent(new CustomEvent('nft_market:session_expired'))
    }

    const message = error.response?.data?.message || error.message || 'Erro ao comunicar com a API.'

    return Promise.reject(new Error(message))
  },
)

export default api
