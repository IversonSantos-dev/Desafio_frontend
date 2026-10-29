import { z } from 'zod'

export const NFTTraitSchema = z.object({
  trait_type: z.string(),
  value: z.string(),
  rarity_score: z.number().optional(),
})

export const NFTRaritySchema = z.enum(['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'])

export const NFTSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  collection: z.string(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string(),
    verified: z.boolean().default(false),
  }),
  image: z.string().url().or(z.string()),
  price: z.string().regex(/^\d+(\.\d+)?$/, 'Preço deve ser uma string decimal válida em ETH'),
  priceUSD: z.string().optional(),
  rarity: NFTRaritySchema,
  totalEditions: z.number().int().positive(),
  availableEditions: z.number().int().nonnegative(),
  traits: z.array(NFTTraitSchema).default([]),
  featured: z.boolean().default(false),
  createdAt: z.string(),
  version: z.number().int().default(1),
})

export const NFTListResponseSchema = z.object({
  items: z.array(NFTSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
})

export type NFTTrait = z.infer<typeof NFTTraitSchema>
export type NFTRarity = z.infer<typeof NFTRaritySchema>
export type NFT = z.infer<typeof NFTSchema>
export type NFTListResponse = z.infer<typeof NFTListResponseSchema>
