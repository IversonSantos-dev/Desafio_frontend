import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CreateOrderInput } from '@/contracts'
import { useAuth } from '@/features/auth/context/AuthContext'
import { queryKeys } from '@/lib/query-keys'
import { ordersApi } from '../api/orders.api'

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getById(orderId),
    enabled: !!orderId,
  })
}

export function useMyOrders() {
  const { user } = useAuth()
  const userId = user?.id || ''

  return useQuery({
    queryKey: queryKeys.orders.list(userId),
    queryFn: () => ordersApi.listMyOrders(),
    enabled: !!userId,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id || ''

  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersApi.create(input),

    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(order.id), order)
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.user(userId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(userId) })
      toast.success('Pedido finalizado com sucesso!')
    },

    onError: (err: Error) => {
      toast.error(err.message || 'Falha ao processar pagamento do pedido.')
    },
  })
}
