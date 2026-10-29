import { z } from 'zod'

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])

export const OrderItemSnapshotSchema = z.object({
  nftId: z.string(),
  title: z.string(),
  collection: z.string(),
  image: z.string(),
  edition: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitPriceETH: z.string().regex(/^\d+(\.\d+)?$/),
})

export const CreateOrderInputSchema = z.object({
  idempotencyKey: z.string().optional(),
  walletAddress: z.string().min(10, 'Endereço de carteira inválido'),
  network: z.enum(['Ethereum', 'Polygon']),
  items: z
    .array(
      z.object({
        nftId: z.string(),
        edition: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, 'Pedido deve conter pelo menos 1 item'),
  quoteVersion: z.number().int().positive(),
  couponCode: z.string().nullable().optional(),
})

export const OrderSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  items: z.array(OrderItemSnapshotSchema),
  subtotalETH: z.string(),
  discountETH: z.string(),
  networkFeeETH: z.string(),
  totalETH: z.string(),
  walletAddress: z.string(),
  network: z.string(),
  transactionHash: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  rejectionReason: z.string().optional(),
  version: z.number().int().default(1),
})

export type OrderStatus = z.infer<typeof OrderStatusSchema>
export type OrderItemSnapshot = z.infer<typeof OrderItemSnapshotSchema>
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>
export type Order = z.infer<typeof OrderSchema>
