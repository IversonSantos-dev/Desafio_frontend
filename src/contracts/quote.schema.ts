import { z } from 'zod'

export const AppliedCouponSchema = z.object({
  code: z.string(),
  discountPercentage: z.number().min(0).max(100),
  discountAmountETH: z.string().regex(/^\d+(\.\d+)?$/),
  expiresAt: z.string(),
})

export const QuoteSchema = z.object({
  subtotalETH: z.string().regex(/^\d+(\.\d+)?$/),
  discountETH: z.string().regex(/^\d+(\.\d+)?$/),
  networkFeeETH: z.string().regex(/^\d+(\.\d+)?$/),
  totalETH: z.string().regex(/^\d+(\.\d+)?$/),
  coupon: AppliedCouponSchema.nullable().optional(),
  quoteTimestamp: z.string(),
  quoteVersion: z.number().int().default(1),
  isOutdated: z.boolean().default(false),
})

export type AppliedCoupon = z.infer<typeof AppliedCouponSchema>
export type Quote = z.infer<typeof QuoteSchema>
