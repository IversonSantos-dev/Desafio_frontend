import { z } from 'zod'
import { NFTSchema } from './nft.schema'

export const CartItemSchema = z.object({
  id: z.string(), // ID único do item no carrinho
  nftId: z.string(),
  edition: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPrice: z.string().regex(/^\d+(\.\d+)?$/, 'Preço unitário em ETH'),
  nft: NFTSchema,
})

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  couponCode: z.string().nullable().optional(),
})

export const AddToCartSchema = z.object({
  nftId: z.string(),
  edition: z.number().int().positive().default(1),
  quantity: z.number().int().positive().default(1),
})

export const UpdateCartItemQuantitySchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().positive(),
})

export type CartItem = z.infer<typeof CartItemSchema>
export type Cart = z.infer<typeof CartSchema>
export type AddToCartInput = z.infer<typeof AddToCartSchema>
export type UpdateCartItemQuantityInput = z.infer<typeof UpdateCartItemQuantitySchema>
