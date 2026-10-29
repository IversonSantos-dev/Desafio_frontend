import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AddToCartInput, Cart, UpdateCartItemQuantityInput } from '@/contracts'
import { useAuth } from '@/features/auth/context/AuthContext'
import { queryKeys } from '@/lib/query-keys'
import { cartApi } from '../api/cart.api'

export function useCart() {
  const { user } = useAuth()
  const cartKey = user?.id || 'guest'

  return useQuery({
    queryKey: queryKeys.cart.user(cartKey),
    queryFn: () => cartApi.getCart(),
    staleTime: 0, // Carrinho sempre fresco
  })
}

export function useQuote() {
  const { user } = useAuth()
  const cartKey = user?.id || 'guest'

  return useQuery({
    queryKey: queryKeys.cart.quote(cartKey),
    queryFn: () => cartApi.getQuote(),
    staleTime: 0,
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const cartKey = user?.id || 'guest'

  return useMutation({
    mutationFn: (input: AddToCartInput) => cartApi.addItem(input),

    onSuccess: (updatedCart) => {
      queryClient.setQueryData(queryKeys.cart.user(cartKey), updatedCart)
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.quote(cartKey) })
      toast.success('NFT adicionado ao carrinho!')
    },

    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao adicionar item ao carrinho.')
    },
  })
}

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const cartKey = user?.id || 'guest'

  return useMutation({
    mutationFn: (input: UpdateCartItemQuantityInput) => cartApi.updateQuantity(input),

    // Atualização otimista
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.user(cartKey) })
      const prevCart = queryClient.getQueryData<Cart>(queryKeys.cart.user(cartKey))

      if (prevCart) {
        queryClient.setQueryData<Cart>(queryKeys.cart.user(cartKey), {
          ...prevCart,
          items: prevCart.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        })
      }

      return { prevCart }
    },

    onError: (err: Error, _vars, context) => {
      if (context?.prevCart) {
        queryClient.setQueryData(queryKeys.cart.user(cartKey), context.prevCart)
      }
      toast.error(err.message || 'Falha ao atualizar quantidade.')
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.user(cartKey) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.quote(cartKey) })
    },
  })
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const cartKey = user?.id || 'guest'

  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),

    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.user(cartKey) })
      const prevCart = queryClient.getQueryData<Cart>(queryKeys.cart.user(cartKey))

      if (prevCart) {
        queryClient.setQueryData<Cart>(queryKeys.cart.user(cartKey), {
          ...prevCart,
          items: prevCart.items.filter((i) => i.id !== itemId),
        })
      }

      return { prevCart }
    },

    onError: (_err, _itemId, context) => {
      if (context?.prevCart) {
        queryClient.setQueryData(queryKeys.cart.user(cartKey), context.prevCart)
      }
      toast.error('Erro ao remover item do carrinho.')
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.user(cartKey) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.quote(cartKey) })
    },
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const cartKey = user?.id || 'guest'

  return useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart.user(cartKey), data.cart)
      queryClient.setQueryData(queryKeys.cart.quote(cartKey), data.quote)
      toast.success('Cupom de desconto aplicado com sucesso!')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Cupom inválido ou expirado.')
    },
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const cartKey = user?.id || 'guest'

  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart.user(cartKey), data.cart)
      queryClient.setQueryData(queryKeys.cart.quote(cartKey), data.quote)
      toast.info('Cupom removido.')
    },
  })
}
