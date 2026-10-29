import { api } from '@/lib/axios'
import type { AddToCartInput, Cart, Quote, UpdateCartItemQuantityInput } from '@/contracts'

export const cartApi = {
  getCart: async (): Promise<Cart> => {
    const { data } = await api.get<Cart>('/cart')
    return data
  },

  addItem: async (input: AddToCartInput): Promise<Cart> => {
    const { data } = await api.post<Cart>('/cart/items', input)
    return data
  },

  updateQuantity: async ({ itemId, quantity }: UpdateCartItemQuantityInput): Promise<Cart> => {
    const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, { quantity })
    return data
  },

  removeItem: async (itemId: string): Promise<Cart> => {
    const { data } = await api.delete<Cart>(`/cart/items/${itemId}`)
    return data
  },

  applyCoupon: async (couponCode: string): Promise<{ cart: Cart; quote: Quote }> => {
    const { data } = await api.post<{ cart: Cart; quote: Quote }>('/cart/coupon', {
      code: couponCode,
    })
    return data
  },

  removeCoupon: async (): Promise<{ cart: Cart; quote: Quote }> => {
    const { data } = await api.delete<{ cart: Cart; quote: Quote }>('/cart/coupon')
    return data
  },

  getQuote: async (): Promise<Quote> => {
    const { data } = await api.get<Quote>('/cart/quote')
    return data
  },
}
