import { z } from 'zod'

export const WalletNetworkSchema = z.enum(['Ethereum', 'Polygon'])
export const WalletTypeSchema = z.enum(['primary', 'secondary'])

export const WalletSchema = z.object({
  id: z.string(),
  userId: z.string(),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço hexadecimal de carteira inválido (0x...)'),
  network: WalletNetworkSchema,
  type: WalletTypeSchema,
  label: z.string().min(1, 'Apelido da carteira é obrigatório'),
  profileName: z.string().min(2, 'Nome do perfil é obrigatório'),
  referralCode: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  ensName: z.string().optional(),
  isConnected: z.boolean().default(false),
  balanceETH: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default('1.50'),
})

export const CreateWalletInputSchema = z.object({
  label: z.string().min(1, 'Apelido da carteira é obrigatório'),
  profileName: z.string().min(2, 'Nome do perfil é obrigatório'),
  referralCode: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  ensName: z.string().optional(),
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço hexadecimal de carteira inválido (0x...)'),
  network: WalletNetworkSchema,
  type: WalletTypeSchema,
})

export const UpdateWalletInputSchema = z.object({
  walletId: z.string(),
  label: z.string().optional(),
  profileName: z.string().optional(),
  referralCode: z.string().optional(),
  email: z.string().email().optional(),
  ensName: z.string().optional(),
  type: WalletTypeSchema.optional(),
  network: WalletNetworkSchema.optional(),
  isConnected: z.boolean().optional(),
})

export type WalletNetwork = z.infer<typeof WalletNetworkSchema>
export type WalletType = z.infer<typeof WalletTypeSchema>
export type Wallet = z.infer<typeof WalletSchema>
export type CreateWalletInput = z.infer<typeof CreateWalletInputSchema>
export type UpdateWalletInput = z.infer<typeof UpdateWalletInputSchema>
