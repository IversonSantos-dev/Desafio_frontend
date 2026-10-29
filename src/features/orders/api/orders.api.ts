import { api } from '@/lib/axios'
import type { CreateOrderInput, Order } from '@/contracts'

export const ordersApi = {
  create: async (input: CreateOrderInput): Promise<Order> => {
    const { data } = await api.post<Order>('/orders', input, {
      headers: {
        'Idempotency-Key': input.idempotencyKey,
      },
    })
    return data
  },

  getById: async (orderId: string): Promise<Order> => {
    const { data } = await api.get<Order>(`/orders/${orderId}`)
    return data
  },

  listMyOrders: async (): Promise<Order[]> => {
    const { data } = await api.get<Order[]>('/orders')
    return data
  },
}
