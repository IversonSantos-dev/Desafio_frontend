import { z } from 'zod'

export const NFTFiltersSchema = z.object({
  q: z.string().optional(),
  collection: z.string().optional(),
  rarity: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.enum(['recent', 'price_asc', 'price_desc']).default('recent'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(12),
})

export type NFTFilters = z.infer<typeof NFTFiltersSchema>
